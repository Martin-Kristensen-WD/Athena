"use server";

import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { del, put } from "@vercel/blob";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/db";
import {
  bodyMeasurements,
  progressPhotos,
  MEASUREMENT_TYPES,
  PROGRESS_PHOTO_VIEWS,
  type MeasurementType,
  type ProgressPhotoView,
} from "@/db/schema";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vælg en gyldig dato.");
const valueSchema = z.coerce.number().positive("Indtast et positivt tal.");

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const PHOTO_EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function parseDayStart(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export type LogMeasurementsState = { error?: string; success?: boolean };

export async function logMeasurements(
  formData: FormData
): Promise<LogMeasurementsState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }
  const userId = session.user.id;

  const parsedDate = dateSchema.safeParse(formData.get("date"));
  if (!parsedDate.success) {
    return { error: "Vælg en gyldig dato." };
  }
  const dayStart = parseDayStart(parsedDate.data);
  if (!dayStart) {
    return { error: "Vælg en gyldig dato." };
  }
  const loggedAt = new Date(dayStart.getTime() + 12 * 60 * 60 * 1000);

  const measurementRows: {
    userId: string;
    type: MeasurementType;
    value: string;
    loggedAt: Date;
  }[] = [];
  for (const type of MEASUREMENT_TYPES) {
    const raw = formData.get(type);
    if (raw === null || raw === "") continue;
    const parsed = valueSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: "Indtast gyldige tal for målingerne." };
    }
    measurementRows.push({ userId, type, value: parsed.data.toString(), loggedAt });
  }

  const photoUploads: { view: ProgressPhotoView; file: File }[] = [];
  for (const view of PROGRESS_PHOTO_VIEWS) {
    const file = formData.get(`photo_${view}`);
    if (file instanceof File && file.size > 0) {
      const extension = PHOTO_EXTENSION_BY_TYPE[file.type];
      if (!extension) {
        return { error: "Billeder skal være JPEG, PNG eller WEBP." };
      }
      if (file.size > MAX_PHOTO_BYTES) {
        return { error: "Billedet er for stort (maks 8 MB)." };
      }
      photoUploads.push({ view, file });
    }
  }

  if (measurementRows.length === 0 && photoUploads.length === 0) {
    return { error: "Indtast mindst én måling eller upload et billede." };
  }

  const db = getDb();

  if (measurementRows.length > 0) {
    await db.insert(bodyMeasurements).values(measurementRows);
  }

  for (const { view, file } of photoUploads) {
    const extension = PHOTO_EXTENSION_BY_TYPE[file.type];
    const pathname = `${userId}/${parsedDate.data}-${view}-${crypto.randomUUID()}.${extension}`;
    await put(pathname, file, { access: "private", contentType: file.type });
    await db.insert(progressPhotos).values({
      userId,
      view,
      pathname,
      contentType: file.type,
      takenAt: loggedAt,
    });
  }

  revalidatePath("/dashboard/measurements");

  return { success: true };
}

export async function deleteMeasurementDay(dateStr: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }
  const userId = session.user.id;

  const dayStart = parseDayStart(dateStr);
  if (!dayStart) {
    return { error: "Ugyldig dato." };
  }
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const db = getDb();

  const photosToDelete = await db
    .select({ id: progressPhotos.id, pathname: progressPhotos.pathname })
    .from(progressPhotos)
    .where(
      and(
        eq(progressPhotos.userId, userId),
        gte(progressPhotos.takenAt, dayStart),
        lt(progressPhotos.takenAt, dayEnd)
      )
    );

  if (photosToDelete.length > 0) {
    await del(photosToDelete.map((photo) => photo.pathname));
    await db.delete(progressPhotos).where(
      inArray(
        progressPhotos.id,
        photosToDelete.map((photo) => photo.id)
      )
    );
  }

  await db
    .delete(bodyMeasurements)
    .where(
      and(
        eq(bodyMeasurements.userId, userId),
        gte(bodyMeasurements.loggedAt, dayStart),
        lt(bodyMeasurements.loggedAt, dayEnd)
      )
    );

  revalidatePath("/dashboard/measurements");
  return { success: true };
}
