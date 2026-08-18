import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("builds the games hub, multiplayer room and Cloudflare worker", async () => {
  const [layout, room, worker, config] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/alien/room.tsx", import.meta.url), "utf8"),
    readFile(new URL("../dist/server/index.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/server/wrangler.json", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /Gausswerks Games/);
  assert.match(room, /Create room/);
  assert.match(worker, /GameRoom/);
  assert.match(config, /GAME_ROOMS/);
});
