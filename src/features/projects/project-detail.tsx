import type { ProjectStatus, ProjectSummary } from "@/types/project";
import { ClipReviewPanel } from "@/features/projects/clip-review-panel";
import { ProcessVideoButton } from "@/features/projects/process-video-button";
import { TranscribeAudioButton } from "@/features/projects/transcribe-audio-button";

type ProjectDetailProps = {
  project: ProjectSummary;
};

const statusLabels: Record<ProjectStatus, string> = {
  uploaded: "Upload concluido",
  processing: "Processando",
  transcribed: "Transcricao pronta",
  clips_generated: "Cortes sugeridos",
  rendered: "Exportacoes prontas",
  error: "Erro",
};

const pipelineSteps: Array<{
  status: ProjectStatus;
  title: string;
  description: string;
}> = [
  {
    status: "uploaded",
    title: "Video enviado",
    description: "Arquivo salvo localmente e projeto registrado.",
  },
  {
    status: "processing",
    title: "Processamento",
    description: "Etapa futura para extrair audio e preparar metadados.",
  },
  {
    status: "transcribed",
    title: "Transcricao",
    description: "Area reservada para texto, SRT e timestamps do Whisper.",
  },
  {
    status: "clips_generated",
    title: "Cortes sugeridos",
    description: "Area reservada para sugestoes e revisao manual.",
  },
  {
    status: "rendered",
    title: "Exportacoes",
    description: "Area reservada para arquivos finais em 9:16.",
  },
];

export function ProjectDetail({ project }: ProjectDetailProps) {
  return (
    <div className="project-detail">
      <section className="project-header surface">
        <div>
          <p className="section-kicker">Workspace</p>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
        </div>

        <div className="project-header-actions">
          <span className={`status-pill status-pill-${project.status}`}>
            {statusLabels[project.status]}
          </span>
          <ProcessVideoButton projectId={project.id} />
        </div>
      </section>

      <section className="project-content-grid">
        <VideoInfo project={project} />
        <ProcessingStatus status={project.status} />
      </section>

      <section className="future-sections" aria-label="Etapas futuras">
        <TranscriptionPanel project={project} />
        <ClipReviewPanel
          canGenerate={Boolean(project.transcription?.segments.length)}
          projectId={project.id}
          suggestions={project.clipSuggestions ?? []}
        />
        <FuturePanel
          eyebrow="Render"
          title="Exportacoes"
          description="Aqui ficarao os videos renderizados, formatos por plataforma e acoes de download."
        />
      </section>
    </div>
  );
}

function VideoInfo({ project }: ProjectDetailProps) {
  return (
    <section className="surface detail-panel">
      <p className="section-kicker">Video enviado</p>
      <h2>Informacoes do arquivo</h2>
      <dl className="metadata-list">
        <div>
          <dt>Arquivo</dt>
          <dd>{project.originalFilename}</dd>
        </div>
        <div>
          <dt>Tamanho</dt>
          <dd>{formatFileSize(project.fileSize)}</dd>
        </div>
        <div>
          <dt>Criado em</dt>
          <dd>{formatDate(project.createdAt)}</dd>
        </div>
        <div>
          <dt>ID do projeto</dt>
          <dd>{project.id}</dd>
        </div>
        <div>
          <dt>Audio extraido</dt>
          <dd>{project.audioPath ?? "Aguardando processamento"}</dd>
        </div>
      </dl>
      {project.errorMessage ? (
        <p className="processing-error">{project.errorMessage}</p>
      ) : null}
      {project.metadata ? (
        <div className="video-metadata-block">
          <h3>Metadados do video</h3>
          <dl className="metadata-list">
            <div>
              <dt>Duracao</dt>
              <dd>{formatDuration(project.metadata.durationSeconds)}</dd>
            </div>
            <div>
              <dt>Resolucao</dt>
              <dd>{formatResolution(project.metadata.width, project.metadata.height)}</dd>
            </div>
            <div>
              <dt>FPS</dt>
              <dd>{formatNullableNumber(project.metadata.fps)}</dd>
            </div>
            <div>
              <dt>Codec</dt>
              <dd>{project.metadata.codec ?? "Nao identificado"}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}

function ProcessingStatus({ status }: { status: ProjectStatus }) {
  const activeIndex = pipelineSteps.findIndex((step) => step.status === status);
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;

  return (
    <section className="surface detail-panel">
      <p className="section-kicker">Pipeline</p>
      <h2>Status do processamento</h2>
      <ol className="pipeline-list">
        {pipelineSteps.map((step, index) => {
          const isDone = index < safeActiveIndex;
          const isCurrent = index === safeActiveIndex;

          return (
            <li
              className={
                isCurrent ? "pipeline-current" : isDone ? "pipeline-done" : ""
              }
              key={step.status}
            >
              <span>{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <small>{step.description}</small>
              </div>
            </li>
          );
        })}
      </ol>
      {status === "error" ? (
        <p className="processing-error">Revise o erro do projeto e tente novamente.</p>
      ) : null}
    </section>
  );
}

function TranscriptionPanel({ project }: ProjectDetailProps) {
  return (
    <section className="surface future-panel transcription-panel">
      <div>
        <p className="section-kicker">Whisper</p>
        <h2>Transcricao</h2>
        <p>
          Transcricao segmentada com timestamps para alimentar a futura geracao
          de cortes.
        </p>
      </div>

      <TranscribeAudioButton
        disabled={!project.audioPath}
        projectId={project.id}
      />

      {project.transcription ? (
        <div className="transcript-content">
          <dl className="metadata-list">
            <div>
              <dt>JSON</dt>
              <dd>{project.transcription.jsonPath ?? "Nao gerado"}</dd>
            </div>
            <div>
              <dt>SRT</dt>
              <dd>{project.transcription.srtPath ?? "Nao gerado"}</dd>
            </div>
          </dl>

          <div className="transcript-segments">
            {project.transcription.segments.length > 0 ? (
              project.transcription.segments.map((segment) => (
                <article key={`${segment.start}-${segment.end}-${segment.text}`}>
                  <time>
                    {formatTimestamp(segment.start)} -{" "}
                    {formatTimestamp(segment.end)}
                  </time>
                  <p>{segment.text}</p>
                </article>
              ))
            ) : (
              <p>{project.transcription.text}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="future-placeholder">
          {project.audioPath
            ? "Audio pronto para transcricao local."
            : "Processe o video para extrair audio antes de transcrever."}
        </div>
      )}
    </section>
  );
}

function FuturePanel({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="surface future-panel">
      <p className="section-kicker">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="future-placeholder">Preparado para proxima etapa</div>
    </section>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
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

function formatDuration(durationSeconds: number | null) {
  if (durationSeconds === null) {
    return "Nao identificada";
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.round(durationSeconds % 60);
  return `${minutes}min ${seconds.toString().padStart(2, "0")}s`;
}

function formatResolution(width: number | null, height: number | null) {
  if (width === null || height === null) {
    return "Nao identificada";
  }

  return `${width} x ${height}`;
}

function formatNullableNumber(value: number | null) {
  if (value === null) {
    return "Nao identificado";
  }

  return value.toString();
}

function formatTimestamp(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.round((totalSeconds % 1) * 1000);

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
}
