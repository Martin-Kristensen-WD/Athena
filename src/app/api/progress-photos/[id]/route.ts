import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { progressPhotos } from "@/db/schema";

export async function GET(_request: Request, ctx: RouteContext<"/api/progress-photos/[id]">) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await ctx.params;
  const db = getDb();
  const [photo] = await db
    .select()
    .from(progressPhotos)
    .where(eq(progressPhotos.id, id));

  if (!photo || photo.userId !== session.user.id) {
    return new NextResponse("Not found", { status: 404 });
  }

  const result = await get(photo.pathname, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
