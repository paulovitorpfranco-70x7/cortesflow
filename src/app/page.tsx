import { storagePaths } from "@/lib/storage/paths";

const pipelineSteps = [
  "Upload local",
  "Metadados do video",
  "Transcricao futura com Whisper",
  "Sugestoes de cortes",
  "Renderizacao vertical com FFmpeg",
];

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">MVP local</p>
        <h1>CortesFlow</h1>
        <p className="lede">
          Fundacao pronta para transformar videos longos em cortes verticais
          para Shorts, TikTok e Reels.
        </p>
      </section>

      <section className="grid">
        <div className="panel">
          <h2>Pipeline</h2>
          <ol className="steps">
            {pipelineSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="panel">
          <h2>Storage local</h2>
          <dl className="paths">
            {Object.entries(storagePaths).map(([name, currentPath]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{currentPath}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  );
}
