import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { programmeShares, programmes, users } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ShareResponseButtons } from "./programmes/share-response-buttons";
import { CancelShareButton } from "./programmes/cancel-share-button";

const STATUS_LABELS: Record<string, string> = {
  pending: "Afventer",
  accepted: "Accepteret",
  declined: "Afvist",
};

const STATUS_VARIANTS: Record<
  string,
  "secondary" | "default" | "outline"
> = {
  pending: "outline",
  accepted: "secondary",
  declined: "outline",
};

export async function SharesTab() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;

  const sender = alias(users, "sender");
  const recipient = alias(users, "recipient");

  const db = getDb();
  const [incoming, sent] = await Promise.all([
    db
      .select({
        id: programmeShares.id,
        programmeName: programmes.name,
        createdAt: programmeShares.createdAt,
        senderName: sender.name,
        senderEmail: sender.email,
      })
      .from(programmeShares)
      .innerJoin(programmes, eq(programmes.id, programmeShares.programmeId))
      .innerJoin(sender, eq(sender.id, programmeShares.sharedByUserId))
      .where(
        and(
          eq(programmeShares.sharedWithUserId, userId),
          eq(programmeShares.status, "pending")
        )
      )
      .orderBy(desc(programmeShares.createdAt)),
    db
      .select({
        id: programmeShares.id,
        programmeName: programmes.name,
        status: programmeShares.status,
        createdAt: programmeShares.createdAt,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
      })
      .from(programmeShares)
      .innerJoin(programmes, eq(programmes.id, programmeShares.programmeId))
      .innerJoin(recipient, eq(recipient.id, programmeShares.sharedWithUserId))
      .where(eq(programmeShares.sharedByUserId, userId))
      .orderBy(desc(programmeShares.createdAt)),
  ]);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Delt med dig</CardTitle>
          <CardDescription>
            Programmer andre har delt med dig. Accepter for at få en kopi i
            dine egne programmer og øvelser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incoming.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Ingen ventende delinger.
            </p>
          ) : (
            <div className="grid gap-3">
              {incoming.map((share) => (
                <div
                  key={share.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{share.programmeName}</p>
                    <p className="text-muted-foreground text-sm">
                      Fra {share.senderName ?? share.senderEmail}
                    </p>
                  </div>
                  <ShareResponseButtons shareId={share.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sendt af dig</CardTitle>
          <CardDescription>
            Programmer du har delt med andre, og status på delingen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Du har ikke delt nogen programmer endnu.
            </p>
          ) : (
            <div className="grid gap-3">
              {sent.map((share) => (
                <div
                  key={share.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{share.programmeName}</p>
                    <p className="text-muted-foreground text-sm">
                      Til {share.recipientName ?? share.recipientEmail}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[share.status]}>
                      {STATUS_LABELS[share.status]}
                    </Badge>
                    {share.status === "pending" && (
                      <CancelShareButton shareId={share.id} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
