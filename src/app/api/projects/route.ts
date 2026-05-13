import { NextResponse } from "next/server";
import { listProjects } from "@/server/modules/projects/projects.service";

export function GET() {
  return NextResponse.json({ projects: listProjects() });
}
