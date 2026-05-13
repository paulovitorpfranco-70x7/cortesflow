"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RenderApprovedClipsButtonProps = {
  disabled?: boolean;
  projectId: string;
};

export function RenderApprovedClipsButton({
  disabled,
  projectId,
}: RenderApprovedClipsButtonProps) {
  const router = useRouter();
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState("");

  async function handleRender() {
    setIsRendering(true);
    setError("");

    try {
      const response = await fetch(`/api/projects/${projectId}/render`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Nao foi possivel renderizar os cortes.");
        return;
      }

      router.refresh();
    } catch {
      setError("Nao foi possivel conectar ao backend.");
    } finally {
      setIsRendering(false);
    }
  }

  return (
    <div className="process-action-stack">
      <button
        className="secondary-action"
        disabled={disabled || isRendering}
        onClick={handleRender}
        type="button"
      >
        {isRendering ? "Renderizando..." : "Renderizar aprovados"}
      </button>
      {error ? <small>{error}</small> : null}
    </div>
  );
}
