import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExercisesTab } from "./exercises-tab";
import { ProgrammesTab } from "./programmes-tab";
import { SessionsTab } from "./sessions-tab";

const tabButton = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "h-8 flex-none after:hidden data-active:border-transparent data-active:bg-secondary data-active:text-secondary-foreground dark:data-active:bg-secondary"
);

export default function WorkoutsPage() {
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
      </Tabs>
    </div>
  );
}
