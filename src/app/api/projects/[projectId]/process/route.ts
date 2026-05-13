import { NextResponse } from "next/server";
import {
  processProjectVideo,
  ProjectNotFoundError,
} from "@/server/modules/projects/projects.service";
import { FFmpegNotInstalledError } from "@/server/modules/video-processing/video-processing.service";

export const runtime = "nodejs";

type ProcessProjectRouteProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(_request: Request, { params }: ProcessProjectRouteProps) {
  const { projectId } = await params;

  try {
    const project = await processProjectVideo(projectId);
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof FFmpegNotInstalledError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel processar o video.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
