import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <section className="game-card" aria-labelledby="not-found-title">
        <header className="game-header">
          <div className="title-row">
            <h1 id="not-found-title">Siden finnes ikke</h1>
          </div>
        </header>
        <div className="game-body">
          <p className="prompt">Siden du leter etter, finnes ikke.</p>
          <Link className="source-link" href="/">
            Til forsiden
          </Link>
        </div>
      </section>
    </main>
  );
}
