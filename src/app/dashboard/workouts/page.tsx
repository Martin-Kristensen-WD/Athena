import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ExercisesTab } from "./exercises-tab";
import { ProgrammesTab } from "./programmes-tab";
import { SessionsTab } from "./sessions-tab";

export default function WorkoutsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Workouts</h1>
      <Tabs defaultValue="exercises" className="mt-6">
        <TabsList>
          <TabsTrigger value="exercises">Exercises</TabsTrigger>
          <TabsTrigger value="programmes">Programmes</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="exercises" className="mt-4">
          <ExercisesTab />
        </TabsContent>
        <TabsContent value="programmes" className="mt-4">
          <ProgrammesTab />
        </TabsContent>
        <TabsContent value="sessions" className="mt-4">
          <SessionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
