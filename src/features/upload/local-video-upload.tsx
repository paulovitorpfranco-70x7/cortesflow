"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { uploadVideo } from "@/features/upload/upload-video.client";

const acceptedFormats = ["MP4", "MOV", "MKV", "WEBM"];
const acceptedExtensions = [".mp4", ".mov", ".mkv", ".webm"];
const maxUploadSizeInMb = 1024;

type UploadState = "idle" | "ready" | "uploading" | "success" | "error";

export function LocalVideoUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);

    if (!file) {
      setStatus("idle");
      setMessage("");
      return;
    }

    const error = validateSelectedFile(file);
    if (error) {
      setStatus("error");
      setMessage(error);
      return;
    }

    setStatus("ready");
    setMessage("Arquivo pronto para criar projeto.");
  }

  async function handleUpload() {
    if (!selectedFile) {
      setStatus("error");
      setMessage("Selecione um video antes de criar o projeto.");
      return;
    }

    const error = validateSelectedFile(selectedFile);
    if (error) {
      setStatus("error");
      setMessage(error);
      return;
    }

    setStatus("uploading");
    setMessage("Salvando upload e criando projeto...");

    const result = await uploadVideo(selectedFile);

    if (result.error || !result.project) {
      setStatus("error");
      setMessage(result.error ?? "Nao foi possivel criar o projeto.");
      return;
    }

    setStatus("success");
    setMessage(`Projeto criado: ${result.project.name}.`);
    setSelectedFile(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    router.refresh();
  }

  return (
    <section className="surface upload-zone" aria-labelledby="upload-title">
      <div>
        <p className="section-kicker">Entrada principal</p>
        <h2 id="upload-title">Upload de video local</h2>
        <p>
          Selecione um arquivo do computador para criar um projeto local. O
          video sera salvo em uploads, sem processamento nesta etapa.
        </p>
      </div>

      <label className="drop-target">
        <input
          ref={inputRef}
          aria-label="Selecionar video local"
          accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm"
          onChange={handleFileChange}
          type="file"
        />
        <span className="drop-icon" aria-hidden="true">
          +
        </span>
        <span className="drop-title">Arraste um video ou clique para selecionar</span>
        <span className="drop-subtitle">
          Limite atual: {maxUploadSizeInMb} MB. O processamento com FFmpeg sera
          adicionado depois.
        </span>
      </label>

      {selectedFile ? (
        <div className="selected-file">
          <span>
            <strong>{selectedFile.name}</strong>
            <small>{formatFileSize(selectedFile.size)}</small>
          </span>
          <button
            disabled={status === "uploading" || status === "error"}
            onClick={handleUpload}
            type="button"
          >
            {status === "uploading" ? "Criando..." : "Criar projeto"}
          </button>
        </div>
      ) : null}

      {message ? (
        <p className={`upload-message upload-message-${status}`}>{message}</p>
      ) : null}

      <div className="format-row" aria-label="Formatos aceitos">
        {acceptedFormats.map((format) => (
          <span key={format}>{format}</span>
        ))}
      </div>
    </section>
  );
}

function validateSelectedFile(file: File) {
  const extension = `.${file.name.split(".").pop() ?? ""}`.toLowerCase();

  if (!acceptedExtensions.includes(extension)) {
    return "Formato invalido. Use MP4, MOV, MKV ou WEBM.";
  }

  if (file.size > maxUploadSizeInMb * 1024 * 1024) {
    return `Arquivo muito grande. Limite atual: ${maxUploadSizeInMb} MB.`;
  }

  return "";
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
