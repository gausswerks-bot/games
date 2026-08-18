import { DurableObject } from "cloudflare:workers";
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

type Army = "Light" | "Medium" | "Heavy" | "Lab";
type Player = { id: string; token: string; name: string; armies: Army[]; connected: boolean };
type RoomData = { code: string; phase: "lobby" | "setup" | "game" | "complete"; players: Player[]; revision: number; gameState: unknown | null; createdAt: number; expiresAt: number };

interface Env {
  ASSETS: Fetcher;
  IMAGES: { input(stream: ReadableStream): { transform(options: Record<string, unknown>): { output(options: { format: string; quality: number }): Promise<{ response(): Response }> } } };
  GAME_ROOMS: DurableObjectNamespace<GameRoom>;
}

const WORDS = ["AMBER","APPLE","ARROW","ATLAS","BASIL","BEACH","BERRY","BLAZE","BRAVE","BRICK","BROOK","CEDAR","CHARM","CHESS","CLIFF","CLOUD","COMET","CORAL","CRANE","CROWN","DELTA","DREAM","EAGLE","EMBER","FIELD","FLAME","FLEET","FLINT","FOCUS","FOREST","FROST","GIANT","GLASS","GLOBE","GRAPE","GREEN","GROVE","HONEY","HORSE","IVORY","JELLY","LASER","LEMON","LIGHT","LOTUS","LUNAR","MAPLE","MARCH","METAL","METRO","NORTH","OASIS","OCEAN","OLIVE","ORBIT","PANDA","PEARL","PILOT","PLANT","PLAZA","PRIME","QUEST","RADAR","RAVEN","RIVER","ROBIN","ROBOT","ROCKY","ROYAL","SOLAR","SPARK","SPEAR","SPIRE","STEEL","STONE","STORM","TIGER","TORCH","TOWER","TRAIL","UNITY","VENUS","WATER","WHALE","WORLD"];
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

export class GameRoom extends DurableObject<Env> {
  room: RoomData | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => { this.room = await ctx.storage.get<RoomData>("room") || null; });
  }

  private async save() {
    if (!this.room) return;
    await this.ctx.storage.put("room", this.room);
    this.broadcast();
  }

  private publicRoom(viewerToken = "") {
    if (!this.room) return null;
    return { ...this.room, players: this.room.players.map(player => ({ ...player, token: player.token === viewerToken ? player.token : "" })) };
  }

  private broadcast() {
    for (const ws of this.ctx.getWebSockets()) try { const { token } = (ws.deserializeAttachment() || {}) as { token?: string }; ws.send(JSON.stringify({ type: "room", room: this.publicRoom(token) })); } catch { /* disconnected */ }
  }

  private expired() { return !!this.room && Date.now() >= this.room.expiresAt; }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/init" && request.method === "POST") {
      const input = await request.json<{ code: string; name: string; token: string }>();
      if (this.room && !this.expired()) return json({ error: "occupied" }, 409);
      const now = Date.now();
      this.room = { code: input.code, phase: "lobby", players: [{ id: crypto.randomUUID(), token: input.token, name: input.name, armies: [], connected: false }], revision: 0, gameState: null, createdAt: now, expiresAt: now + 3 * 60 * 60 * 1000 };
      await this.ctx.storage.setAlarm(this.room.expiresAt);
      await this.save();
      return json({ room: this.publicRoom(input.token), token: input.token });
    }
    if (url.pathname === "/join" && request.method === "POST") {
      if (!this.room || this.expired()) return json({ error: "That room has expired or does not exist." }, 404);
      const input = await request.json<{ name: string; token: string }>();
      let player = this.room.players.find(item => item.token === input.token);
      if (!player) { player = { id: crypto.randomUUID(), token: input.token, name: input.name, armies: [], connected: false }; this.room.players.push(player); }
      else player.name = input.name;
      await this.save(); return json({ room: this.publicRoom(input.token), token: input.token });
    }
    if (url.pathname === "/socket") {
      if (!this.room || this.expired()) return json({ error: "Room expired." }, 410);
      const token = url.searchParams.get("token") || "";
      const player = this.room.players.find(item => item.token === token);
      if (!player || request.headers.get("Upgrade") !== "websocket") return json({ error: "Join the room first." }, 401);
      const pair = new WebSocketPair(); const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server); server.serializeAttachment({ token }); player.connected = true; await this.save();
      return new Response(null, { status: 101, webSocket: client });
    }
    return json({ error: "Not found" }, 404);
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (!this.room || this.expired() || typeof raw !== "string") return;
    const { token } = (ws.deserializeAttachment() || {}) as { token?: string };
    const player = this.room.players.find(item => item.token === token); if (!player) return;
    const message = JSON.parse(raw) as { type: string; army?: Army; state?: unknown; activeArmy?: Army; complete?: boolean };
    if (message.type === "claim" && this.room.phase === "lobby" && message.army) {
      const owner = this.room.players.find(item => item.armies.includes(message.army!));
      if (!owner) player.armies.push(message.army); else if (owner.token === player.token) owner.armies = owner.armies.filter(army => army !== message.army);
    } else if (message.type === "start" && this.room.phase === "lobby") {
      const assigned = new Set(this.room.players.flatMap(item => item.armies));
      if (["Light","Medium","Heavy","Lab"].every(army => assigned.has(army as Army))) this.room.phase = "setup";
    } else if (message.type === "state" && this.room.phase !== "lobby" && message.state) {
      const currentTurn = (this.room.gameState as { turn?: number } | null)?.turn;
      const currentArmy = typeof currentTurn === "number" ? (["Light", "Medium", "Heavy", "Lab"] as Army[])[currentTurn] : null;
      // Authorise against the state currently held by the room. An end-turn
      // update already names the next active army, but it is still being made
      // legitimately by the player whose turn is ending.
      const canWrite = this.room.phase === "setup" || (currentArmy ? player.armies.includes(currentArmy) : !!message.activeArmy && player.armies.includes(message.activeArmy));
      if (canWrite) { this.room.gameState = message.state; this.room.revision++; this.room.phase = message.complete ? "complete" : "game"; }
    }
    await this.save();
  }

  async webSocketClose(ws: WebSocket) {
    if (!this.room) return;
    const { token } = (ws.deserializeAttachment() || {}) as { token?: string };
    const player = this.room.players.find(item => item.token === token);
    if (player) { player.connected = this.ctx.getWebSockets().some(other => other !== ws && (other.deserializeAttachment() as {token?:string})?.token === token); await this.save(); }
  }

  async alarm() {
    for (const ws of this.ctx.getWebSockets()) try { ws.close(1000, "Room expired"); } catch { /* closed */ }
    this.room = null; await this.ctx.storage.deleteAll();
  }
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/rooms/create" && request.method === "POST") {
      const body = await request.text();
      for (let attempt = 0; attempt < 20; attempt++) {
        const code = WORDS[Math.floor(Math.random() * WORDS.length)];
        const id = env.GAME_ROOMS.idFromName(code); const stub = env.GAME_ROOMS.get(id);
        const input = JSON.parse(body); const response = await stub.fetch("https://room/init", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...input, code }) });
        if (response.status !== 409) return response;
      }
      return json({ error: "No room word is currently available. Please try again." }, 503);
    }
    const match = url.pathname.match(/^\/api\/rooms\/([A-Z]{5})\/(join|socket)$/i);
    if (match) {
      const stub = env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName(match[1].toUpperCase()));
      const target = new URL(request.url); target.hostname = "room"; target.pathname = `/${match[2]}`;
      return stub.fetch(new Request(target, request));
    }
    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, { fetchAsset: path => env.ASSETS.fetch(new Request(new URL(path, request.url))), transformImage: async (body, { width, format, quality }) => (await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality })).response() }, allowedWidths);
    }
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
