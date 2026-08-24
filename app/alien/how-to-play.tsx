"use client";

import { useEffect, useState } from "react";

export default function HowToPlay({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", close);
    document.body.classList.add("rules-open");
    return () => {
      document.removeEventListener("keydown", close);
      document.body.classList.remove("rules-open");
    };
  }, [open]);

  return <>
    <button className={`rules-trigger${compact ? " compact" : ""}`} onClick={() => setOpen(true)} aria-haspopup="dialog">
      <span aria-hidden="true">?</span> How to play
    </button>
    {open && <div className="rules-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
      <section className="rules-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-title" onMouseDown={event => event.stopPropagation()}>
        <header><div><p className="eyebrow">FIELD MANUAL</p><h2 id="rules-title">How to play</h2></div><button className="rules-close" onClick={() => setOpen(false)} aria-label="Close how to play">×</button></header>
        <div className="rules-intro"><b>Work together to complete the Ultimate Weapon before the Mothership arrives or the Lab is destroyed.</b><span>Commit 15 Alien Tech to win.</span></div>
        <nav aria-label="How to play sections"><a href="#rules-turn">Your turn</a><a href="#rules-battle">Move & fight</a><a href="#rules-build">Build</a><a href="#rules-armies">Armies</a><a href="#rules-lose">Danger</a></nav>
        <div className="rules-content">
          <article><span className="rules-number">01</span><div><h3>Set up the defence</h3><p>Choose the Lab’s city. One Heavy, two Medium and three Light units deploy there from spaces 15 down to 10. Aliens enter each city from space 1 upward.</p><p>In multiplayer, players claim all four commands. One person may control several armies, and clicking a claimed army again releases it.</p></div></article>
          <article id="rules-turn"><span className="rules-number">02</span><div><h3>Take a turn</h3><ol><li><b>Draw:</b> reveal an invasion card. Its aliens deploy automatically in the named city.</li><li><b>Collect:</b> add the card’s resources to the active army.</li><li><b>Act:</b> in any order, move and fight, upgrade, share resources, manufacture Alien Tech, or commit Alien Tech.</li><li><b>End turn:</b> play passes Light → Medium → Heavy → Lab.</li></ol><p>You do not have to spend every resource or move every unit. Unused resources remain with that command.</p></div></article>
          <article id="rules-battle"><span className="rules-number">03</span><div><h3>Move and fight</h3><p>Select a unit, then an empty destination. Units may pass through friendly units but cannot move through aliens. Each unit can move up to its allowance during its command’s turn:</p><div className="rules-stats"><span><b>Light</b>Move 3 · kill 1</span><span><b>Medium</b>Move 2 · kill 2</span><span><b>Heavy</b>Move 1 · kill 3</span></div><p>After each step, the moving unit defeats adjacent aliens up to its kill value. If there are more targets than it can defeat, choose which highlighted aliens to remove.</p><p>A unit is overwhelmed when the number of adjacent aliens reaches its kill value. A direct alien drop also kills an unarmoured unit.</p></div></article>
          <article id="rules-build"><span className="rules-number">04</span><div><h3>Develop the weapon</h3><p>Resources belong to individual commands, but the active command may share them one at a time. Click the next level on that command’s panel to pay its displayed upgrade cost.</p><ul><li><b>Level 2:</b> manufacture 1 Alien Tech for 3 Steel + 3 Energy + 3 Intelligence.</li><li><b>Level 3:</b> manufacture 1 Alien Tech for 2 of each resource.</li><li><b>Commit Tech:</b> spend 1 Alien Tech to advance the shared Ultimate Weapon by one. Reach 15 to win.</li></ul><p>Alien Tech can also appear directly on invasion cards.</p></div></article>
          <article id="rules-armies"><span className="rules-number">05</span><div><h3>Upgrade specialities</h3><div className="rules-armies"><section><b>Light Command</b><p>L1 moves the Lab once per Light turn to a neighbouring city. L2 can command Medium units. L3 can also command Heavy units.</p></section><section><b>Medium Command</b><p>Reduces every invasion by 1, then 2, then 3 aliens.</p></section><section><b>Heavy Command</b><p>Drop armour protects Heavy units at L1, Medium at L2 and Light at L3 by redirecting direct drops where space permits.</p></section><section><b>Lab Command</b><p>Revives 2, 4 or 6 points of fallen units per Lab turn. Light costs 1, Medium 2 and Heavy 3 revival points.</p></section></div></div></article>
          <article id="rules-lose"><span className="rules-number danger">!</span><div><h3>How humanity loses</h3><ul><li>If all 15 spaces in the Lab’s city are occupied by aliens when any turn ends, the Lab is destroyed.</li><li>If the 60-card invasion deck runs out, the Mothership arrives.</li></ul><p>When a city fills, further aliens overflow toward the Lab through neighbouring cities. Reinforcement cards deploy one Heavy, two Medium and three Light units at the Lab city where safe spaces remain.</p></div></article>
        </div>
      </section>
    </div>}
  </>;
}
