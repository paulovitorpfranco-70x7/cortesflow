"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProcessVideoButtonProps = {
  projectId: string;
};

export function ProcessVideoButton({ projectId }: ProcessVideoButtonProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  async function handleProcessVideo() {
    setIsProcessing(true);
    setError("");

    try {
      const response = await fetch(`/api/projects/${projectId}/process`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Nao foi possivel processar o video.");
        return;
      }

      router.refresh();
    } catch {
      setError("Nao foi possivel conectar ao backend.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="process-action-stack">
      <button
        className="primary-action project-process-button"
        disabled={isProcessing}
        onClick={handleProcessVideo}
        type="button"
      >
        {isProcessing ? "Processando..." : "Processar video"}
      </button>
      {error ? <small>{error}</small> : null}
    </div>
  );
}
