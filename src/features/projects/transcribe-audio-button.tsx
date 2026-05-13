"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TranscribeAudioButtonProps = {
  disabled?: boolean;
  projectId: string;
};

export function TranscribeAudioButton({
  disabled,
  projectId,
}: TranscribeAudioButtonProps) {
  const router = useRouter();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState("");

  async function handleTranscribe() {
    setIsTranscribing(true);
    setError("");

    try {
      const response = await fetch(`/api/projects/${projectId}/transcribe`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Nao foi possivel transcrever o audio.");
        return;
      }

      router.refresh();
    } catch {
      setError("Nao foi possivel conectar ao backend.");
    } finally {
      setIsTranscribing(false);
    }
  }

  return (
    <div className="process-action-stack">
      <button
        className="secondary-action"
        disabled={disabled || isTranscribing}
        onClick={handleTranscribe}
        type="button"
      >
        {isTranscribing ? "Transcrevendo..." : "Transcrever audio"}
      </button>
      {error ? <small>{error}</small> : null}
    </div>
  );
}
