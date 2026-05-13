import { AppHero } from "@/features/home/app-hero";
import { HomeWorkspace } from "@/features/home/home-workspace";
import { recentProjects } from "@/server/modules/projects/projects.service";

export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <main className="app-shell">
      <AppHero />
      <HomeWorkspace projects={await recentProjects()} />
    </main>
  );
}
