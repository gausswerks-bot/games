import Link from "next/link";

export default function GamesHub() {
  return (
    <main className="hub-shell">
      <header className="hub-header">
        <p className="hub-kicker">GAUSSWERKS</p>
        <h1>Games</h1>
        <p>Original games and playable prototypes.</p>
      </header>
      <section className="game-grid" aria-label="Available games">
        <Link className="game-card" href="/alien">
          <div className="game-card-art" aria-hidden="true">
            <span className="planet" />
            <span className="invader invader-one">◆</span>
            <span className="invader invader-two">◆</span>
            <span className="invader invader-three">◆</span>
          </div>
          <div className="game-card-copy">
            <span className="game-status">PLAYABLE PROTOTYPE</span>
            <h2>Alien Invasion</h2>
            <p>Defend five cities, develop alien technology and destroy the mothership before the invasion overwhelms the Lab.</p>
            <span className="play-link">Play now <span aria-hidden="true">→</span></span>
          </div>
        </Link>
      </section>
    </main>
  );
}
