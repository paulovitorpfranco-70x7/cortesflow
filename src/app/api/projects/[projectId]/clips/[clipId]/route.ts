import { NextResponse } from "next/server";
import {
  ClipSuggestionNotFoundError,
  ProjectNotFoundError,
  updateProjectClipSuggestion,
} from "@/server/modules/projects/projects.service";
import type { ClipReviewStatus } from "@/types/project";

export const runtime = "nodejs";

type UpdateClipRouteProps = {
  params: Promise<{
    clipId: string;
    projectId: string;
  }>;
};

type UpdateClipPayload = {
  end?: number;
  reviewStatus?: ClipReviewStatus;
  start?: number;
};

export async function PATCH(request: Request, { params }: UpdateClipRouteProps) {
  const { clipId, projectId } = await params;
  let payload: UpdateClipPayload;

  try {
    payload = (await request.json()) as UpdateClipPayload;
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  try {
    const project = await updateProjectClipSuggestion(projectId, clipId, payload);
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof ClipSuggestionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel atualizar o corte.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
