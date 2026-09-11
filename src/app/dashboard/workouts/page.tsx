import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { programmeShares } from "@/db/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExercisesTab } from "./exercises-tab";
import { ProgrammesTab } from "./programmes-tab";
import { SessionsTab } from "./sessions-tab";
import { SharesTab } from "./shares-tab";

const tabButton = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "h-8 flex-none after:hidden data-active:border-transparent data-active:bg-secondary data-active:text-secondary-foreground dark:data-active:bg-secondary"
);

export default async function WorkoutsPage() {
  const session = await auth();

  let pendingShareCount = 0;
  if (session?.user?.id) {
    const rows = await getDb()
      .select({ id: programmeShares.id })
      .from(programmeShares)
      .where(
        and(
          eq(programmeShares.sharedWithUserId, session.user.id),
          eq(programmeShares.status, "pending")
        )
      );
    pendingShareCount = rows.length;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Træning</h1>
      <Tabs defaultValue="programmes" className="mt-6">
        <TabsList className="h-auto w-fit flex-wrap gap-2 bg-transparent p-0">
          <TabsTrigger value="programmes" className={tabButton}>
            Programmer
          </TabsTrigger>
          <TabsTrigger value="sessions" className={tabButton}>
            Træningspas
          </TabsTrigger>
          <TabsTrigger value="exercises" className={tabButton}>
            Øvelser
          </TabsTrigger>
          <TabsTrigger value="shares" className={tabButton}>
            Delt
            {pendingShareCount > 0 && (
              <Badge className="ml-1 h-4 min-w-4 px-1">
                {pendingShareCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="programmes" className="mt-4">
          <ProgrammesTab />
        </TabsContent>
        <TabsContent value="sessions" className="mt-4">
          <SessionsTab />
        </TabsContent>
        <TabsContent value="exercises" className="mt-4">
          <ExercisesTab />
        </TabsContent>
        <TabsContent value="shares" className="mt-4">
          <SharesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
