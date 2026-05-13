export function YoutubeLinkCard() {
  return (
    <section className="surface youtube-card" aria-labelledby="youtube-title">
      <div>
        <p className="section-kicker">Futuro</p>
        <h2 id="youtube-title">Colar link do YouTube</h2>
        <p>
          A entrada por URL ficara desabilitada ate o upload local e o pipeline
          base estarem estaveis.
        </p>
      </div>

      <div className="disabled-input-row" aria-disabled="true">
        <input
          disabled
          placeholder="https://www.youtube.com/watch?v=..."
          type="url"
        />
        <button disabled type="button">
          Importar
        </button>
      </div>
    </section>
  );
}
