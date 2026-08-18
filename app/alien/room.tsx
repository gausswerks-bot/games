"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Game from "./game";

export type ArmyName = "Light" | "Medium" | "Heavy" | "Lab";
export type RoomPlayer = { id: string; token: string; name: string; armies: ArmyName[]; connected: boolean };
export type RoomView = {
  code: string;
  phase: "lobby" | "setup" | "game" | "complete";
  players: RoomPlayer[];
  revision: number;
  gameState: unknown | null;
  expiresAt: number;
};

export type MultiplayerSession = {
  code: string;
  token: string;
  armies: ArmyName[];
  view: RoomView;
  sendState: (state: unknown, activeArmy: ArmyName, complete?: boolean) => void;
};

const ARMIES: ArmyName[] = ["Light", "Medium", "Heavy", "Lab"];

function tokenForRoom(code: string) {
  const key = `alien-room-token-${code}`;
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
}

export default function RoomGate() {
  const [screen, setScreen] = useState<"home" | "join" | "lobby" | "game">("home");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [view, setView] = useState<RoomView | null>(null);
  const [error, setError] = useState("");
  const socket = useRef<WebSocket | null>(null);

  const connect = useCallback(function reconnect(roomCode: string, playerToken: string) {
    socket.current?.close();
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${location.host}/api/rooms/${roomCode}/socket?token=${encodeURIComponent(playerToken)}`);
    socket.current = ws;
    ws.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.type !== "room") return;
      setView(message.room);
      setScreen(message.room.phase === "lobby" ? "lobby" : "game");
    };
    ws.onclose = () => setTimeout(() => {
      if (socket.current === ws && document.visibilityState !== "hidden") reconnect(roomCode, playerToken);
    }, 1200);
  }, []);

  useEffect(() => () => socket.current?.close(), []);

  useEffect(() => {
    const savedCode = localStorage.getItem("alien-last-room");
    const savedName = localStorage.getItem("alien-player-name");
    if (!savedCode || !savedName || new URLSearchParams(location.search).get("local") === "1") return;
    const savedToken = tokenForRoom(savedCode);
    fetch(`/api/rooms/${savedCode}/join`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: savedName, token: savedToken }) })
      .then(async response => ({ ok: response.ok, data: await response.json() as { room?: RoomView } }))
      .then(({ ok, data }) => { if (!ok || !data.room) return; setName(savedName); setCode(savedCode); setToken(savedToken); setView(data.room); setScreen(data.room.phase === "lobby" ? "lobby" : "game"); connect(savedCode, savedToken); })
      .catch(() => undefined);
  }, [connect]);

  async function enter(create: boolean) {
    if (!name.trim()) { setError("Enter your name first."); return; }
    const roomCode = create ? "" : code.trim().toUpperCase();
    if (!create && !/^[A-Z]{5}$/.test(roomCode)) { setError("Enter the five-letter room word."); return; }
    const playerToken = tokenForRoom(create ? "new" : roomCode);
    const response = await fetch(create ? "/api/rooms/create" : `/api/rooms/${roomCode}/join`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), token: playerToken }),
    });
    const data = await response.json() as { room?: RoomView; error?: string; token?: string };
    if (!response.ok || !data.room) { setError(data.error || "Unable to enter that room."); return; }
    const finalCode = data.room.code;
    localStorage.setItem(`alien-room-token-${finalCode}`, data.token || playerToken);
    localStorage.setItem("alien-last-room", finalCode);
    localStorage.setItem("alien-player-name", name.trim());
    localStorage.removeItem("alien-room-token-new");
    setCode(finalCode); setToken(data.token || playerToken); setView(data.room); setError(""); setScreen("lobby");
    connect(finalCode, data.token || playerToken);
  }

  function send(message: unknown) {
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(message));
  }

  const mine = useMemo(() => view?.players.find(player => player.token === token)?.armies || [], [view, token]);

  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("local") === "1") return <Game />;

  if (screen === "game" && view) {
    const session: MultiplayerSession = {
      code, token, armies: mine, view,
      sendState: (state, activeArmy, complete) => send({ type: "state", state, activeArmy, complete }),
    };
    return <Game multiplayer={session} />;
  }

  if (screen === "lobby" && view) {
    const filled = ARMIES.every(army => view.players.some(player => player.armies.includes(army)));
    return <main className="room-shell">
      <section className="room-card lobby-card">
        <p className="hub-kicker">ALIEN INVASION ROOM</p>
        <h1>{view.code}</h1>
        <p>Share this five-letter word. The room expires three hours after it was created.</p>
        <div className="army-picks">{ARMIES.map(army => {
          const owner = view.players.find(player => player.armies.includes(army));
          const owned = owner?.token === token;
          return <button key={army} className={owned ? "mine" : owner ? "taken" : ""} disabled={!!owner && !owned} onClick={() => send({ type: "claim", army })}>
            <b>{army}</b><span>{owner ? owner.name : "Available"}</span>{owned && <small>Click to release</small>}
          </button>;
        })}</div>
        <div className="room-players">{view.players.map(player => <span key={player.id} className={player.connected ? "online" : ""}>{player.name} · {player.armies.length || "selecting"}</span>)}</div>
        <button className="room-primary" disabled={!filled} onClick={() => send({ type: "start" })}>{filled ? "Start game" : "Assign all four armies"}</button>
      </section>
    </main>;
  }

  return <main className="room-shell"><section className="room-card">
    <p className="hub-kicker">ONLINE CO-OP</p><h1>Alien Invasion</h1>
    <p>Create a new three-hour game or join friends using their five-letter room word.</p>
    <label>Your name<input value={name} maxLength={24} onChange={event => setName(event.target.value)} placeholder="Player name" /></label>
    {screen === "join" && <label>Room word<input value={code} maxLength={5} onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} placeholder="COMET" /></label>}
    {error && <p className="room-error">{error}</p>}
    <div className="room-actions">{screen === "join" ? <><button onClick={() => setScreen("home")}>Back</button><button className="room-primary" onClick={() => enter(false)}>Join room</button></> : <><button onClick={() => setScreen("join")}>Join room</button><button className="room-primary" onClick={() => enter(true)}>Create room</button></>}</div>
    <a className="local-play" href="/alien?local=1">Play on one screen instead</a>
  </section></main>;
}
