import type { ProjectSummary } from "@/types/project";
import { RecentProjects } from "@/features/projects/recent-projects";
import { LocalVideoUpload } from "@/features/upload/local-video-upload";
import { YoutubeLinkCard } from "@/features/upload/youtube-link-card";

type HomeWorkspaceProps = {
  projects: ProjectSummary[];
};

export function HomeWorkspace({ projects }: HomeWorkspaceProps) {
  return (
    <section className="workspace-grid" aria-label="Area de trabalho">
      <div className="workspace-main">
        <LocalVideoUpload />
        <YoutubeLinkCard />
      </div>

      <aside className="workspace-side" aria-label="Projetos recentes">
        <RecentProjects projects={projects} />
      </aside>
    </section>
  );
}
