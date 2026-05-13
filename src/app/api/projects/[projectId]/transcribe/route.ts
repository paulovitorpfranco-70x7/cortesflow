import { NextResponse } from "next/server";
import {
  ProjectNotFoundError,
  transcribeProjectAudio,
} from "@/server/modules/projects/projects.service";
import {
  WhisperConfigurationError,
  WhisperNotInstalledError,
} from "@/server/modules/transcription/transcription.service";

export const runtime = "nodejs";

type TranscribeProjectRouteProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(
  _request: Request,
  { params }: TranscribeProjectRouteProps,
) {
  const { projectId } = await params;

  try {
    const project = await transcribeProjectAudio(projectId);
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (
      error instanceof WhisperNotInstalledError ||
      error instanceof WhisperConfigurationError
    ) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel transcrever o audio.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
