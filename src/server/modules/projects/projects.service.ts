export type ProjectSummary = {
  id: string;
  name: string;
  status: "empty" | "processing" | "ready";
};

export function listProjects(): ProjectSummary[] {
  return [
    {
      id: "local-foundation",
      name: "Fundacao local",
      status: "empty",
    },
  ];
}
