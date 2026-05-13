"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GenerateClipsButtonProps = {
  disabled?: boolean;
  projectId: string;
};

export function GenerateClipsButton({
  disabled,
  projectId,
}: GenerateClipsButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerateClips() {
    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch(`/api/projects/${projectId}/clips`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Nao foi possivel gerar cortes.");
        return;
      }

      router.refresh();
    } catch {
      setError("Nao foi possivel conectar ao backend.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="process-action-stack">
      <button
        className="secondary-action"
        disabled={disabled || isGenerating}
        onClick={handleGenerateClips}
        type="button"
      >
        {isGenerating ? "Gerando..." : "Gerar cortes"}
      </button>
      {error ? <small>{error}</small> : null}
    </div>
  );
}
