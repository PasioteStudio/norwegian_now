import Link from "next/link";
import type { ReactNode } from "react";

type GameShellProps = {
  activeGame: "words" | "values";
  children: ReactNode;
  streak: number;
};

export default function GameShell({
  activeGame,
  children,
  streak,
}: GameShellProps) {
  return (
    <main className="page">
      <section className="game-card" aria-label="Norsk stavelek">
        <header className="game-header">
          <div className="title-row">
            <h1>Norsk nå</h1>
            <span className="flag" aria-label="Norsk flagg">
              🇳🇴
            </span>
          </div>
          <p className="streak" aria-live="polite">
            Seiersrekke: {streak} 💥
          </p>
        </header>
        <nav className="game-nav" aria-label="Velg spill">
          <Link
            href="/"
            className={activeGame === "words" ? "active" : ""}
            aria-current={activeGame === "words" ? "page" : undefined}
          >
            Ord
          </Link>
          <Link
            href="/value"
            className={activeGame === "values" ? "active" : ""}
            aria-current={activeGame === "values" ? "page" : undefined}
          >
            Priser
          </Link>
        </nav>
        {children}
      </section>
    </main>
  );
}
