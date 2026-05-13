"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GenerateClipsButton } from "@/features/projects/generate-clips-button";
import { RenderApprovedClipsButton } from "@/features/projects/render-approved-clips-button";
import type { ClipReviewStatus, ClipSuggestion } from "@/types/project";

type ClipReviewPanelProps = {
  canGenerate: boolean;
  projectId: string;
  suggestions: ClipSuggestion[];
};

const reviewLabels: Record<ClipReviewStatus, string> = {
  suggested: "Sugerido",
  selected: "Selecionado",
  approved: "Aprovado",
  discarded: "Descartado",
};

export function ClipReviewPanel({
  canGenerate,
  projectId,
  suggestions,
}: ClipReviewPanelProps) {
  const hasApprovedClips = suggestions.some(
    (clip) => clip.reviewStatus === "approved",
  );

  return (
    <section className="surface future-panel clip-suggestions-panel">
      <div>
        <p className="section-kicker">Analise</p>
        <h2>Revisao dos cortes</h2>
        <p>
          Ajuste tempos, selecione candidatos e marque quais cortes seguem para
          a etapa de renderizacao.
        </p>
      </div>

      <GenerateClipsButton disabled={!canGenerate} projectId={projectId} />
      <RenderApprovedClipsButton
        disabled={!hasApprovedClips}
        projectId={projectId}
      />

      {suggestions.length > 0 ? (
        <div className="clip-list">
          {suggestions.map((clip) => (
            <ClipReviewItem clip={clip} key={clip.id} projectId={projectId} />
          ))}
        </div>
      ) : (
        <div className="future-placeholder">
          {canGenerate
            ? "Transcricao pronta para gerar sugestoes."
            : "Transcreva o audio antes de gerar cortes."}
        </div>
      )}
    </section>
  );
}

function ClipReviewItem({
  clip,
  projectId,
}: {
  clip: ClipSuggestion;
  projectId: string;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [start, setStart] = useState(clip.start.toString());
  const [end, setEnd] = useState(clip.end.toString());

  async function updateClip(payload: {
    end?: number;
    reviewStatus?: ClipReviewStatus;
    start?: number;
  }) {
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/projects/${projectId}/clips/${clip.id}`,
        {
          body: JSON.stringify(payload),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        },
      );
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Nao foi possivel atualizar o corte.");
        return;
      }

      setIsEditing(false);
      router.refresh();
    } catch {
      setError("Nao foi possivel conectar ao backend.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleSaveTimes() {
    updateClip({
      end: Number(end),
      start: Number(start),
    });
  }

  return (
    <article className={`clip-item clip-item-${clip.reviewStatus}`}>
      <div className="clip-item-heading">
        <strong>{clip.title}</strong>
        <div className="clip-badges">
          <em>{clip.score.toFixed(1)}</em>
          <span>{reviewLabels[clip.reviewStatus]}</span>
          <span>{renderLabel(clip.renderStatus)}</span>
        </div>
      </div>

      {isEditing ? (
        <div className="clip-edit-grid">
          <label>
            Inicio
            <input
              min="0"
              onChange={(event) => setStart(event.target.value)}
              step="0.1"
              type="number"
              value={start}
            />
          </label>
          <label>
            Fim
            <input
              min="0"
              onChange={(event) => setEnd(event.target.value)}
              step="0.1"
              type="number"
              value={end}
            />
          </label>
          <button disabled={isSaving} onClick={handleSaveTimes} type="button">
            Salvar alteracoes
          </button>
        </div>
      ) : (
        <dl className="clip-metadata">
          <div>
            <dt>Inicio</dt>
            <dd>{formatTimestamp(clip.start)}</dd>
          </div>
          <div>
            <dt>Fim</dt>
            <dd>{formatTimestamp(clip.end)}</dd>
          </div>
          <div>
            <dt>Duracao</dt>
            <dd>{formatDuration(clip.duration)}</dd>
          </div>
        </dl>
      )}

      <p>{clip.text}</p>

      <div className="clip-actions">
        <button
          disabled={isSaving}
          onClick={() => updateClip({ reviewStatus: "selected" })}
          type="button"
        >
          Selecionar
        </button>
        <button
          disabled={isSaving}
          onClick={() => setIsEditing((current) => !current)}
          type="button"
        >
          Editar tempo
        </button>
        <button disabled title="Preview sera ligado ao player do projeto" type="button">
          Pre-visualizar
        </button>
        <button
          disabled={isSaving}
          onClick={() => updateClip({ reviewStatus: "approved" })}
          type="button"
        >
          Aprovar
        </button>
        <button
          disabled={isSaving}
          onClick={() => updateClip({ reviewStatus: "discarded" })}
          type="button"
        >
          Descartar
        </button>
        {clip.renderStatus === "rendered" ? (
          <a
            href={`/api/projects/${projectId}/clips/${clip.id}/download`}
          >
            Baixar MP4
          </a>
        ) : null}
      </div>

      {error ? <small className="clip-error">{error}</small> : null}
    </article>
  );
}

function renderLabel(status: ClipSuggestion["renderStatus"]) {
  const labels: Record<ClipSuggestion["renderStatus"], string> = {
    error: "Render erro",
    pending: "Nao renderizado",
    rendered: "Renderizado",
    rendering: "Renderizando",
  };

  return labels[status];
}

function formatDuration(durationSeconds: number | null) {
  if (durationSeconds === null) {
    return "Nao identificada";
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.round(durationSeconds % 60);
  return `${minutes}min ${seconds.toString().padStart(2, "0")}s`;
}

function formatTimestamp(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.round((totalSeconds % 1) * 1000);

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
}
