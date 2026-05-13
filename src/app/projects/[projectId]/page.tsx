import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectDetail } from "@/features/projects/project-detail";
import { getProjectById } from "@/server/modules/projects/projects.service";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <main className="app-shell">
      <Link className="text-link" href="/">
        Voltar
      </Link>
      <ProjectDetail project={project} />
    </main>
  );
}
