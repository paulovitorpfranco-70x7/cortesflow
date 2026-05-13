import Link from "next/link";
import type { ProjectSummary } from "@/types/project";

type RecentProjectsProps = {
  projects: ProjectSummary[];
};

const statusLabels: Record<ProjectSummary["status"], string> = {
  uploaded: "Enviado",
  processing: "Processando",
  ready: "Pronto",
  failed: "Erro",
};

export function RecentProjects({ projects }: RecentProjectsProps) {
  return (
    <section className="surface recent-projects">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Historico</p>
          <h2>Projetos recentes</h2>
        </div>
        <Link href="/projects/new">Criar</Link>
      </div>

      <div className="project-list">
        {projects.length > 0 ? (
          projects.map((project) => (
            <Link
              className="project-item"
              href={`/projects/${project.id}`}
              key={project.id}
            >
              <span>
                <strong>{project.name}</strong>
                <small>{project.originalFilename}</small>
                <small>
                  {formatFileSize(project.fileSize)} -{" "}
                  {formatDate(project.createdAt)}
                </small>
              </span>
              <em>{statusLabels[project.status]}</em>
            </Link>
          ))
        ) : (
          <div className="empty-state">
            <strong>Nenhum projeto ainda</strong>
            <small>Envie um video local para criar o primeiro projeto.</small>
          </div>
        )}
      </div>
    </section>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

function formatFileSize(sizeInBytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let size = sizeInBytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
