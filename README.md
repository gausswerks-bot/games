# Gausswerks Games

The source for the games hub at `games.gausswerks.co`.

## Routes

- `/` — games hub
- `/alien` — Alien Invasion cooperative board-game prototype

Alien Invasion supports five-letter multiplayer rooms backed by a Cloudflare Durable Object. Players may claim one or more of the four armies, reconnect after interruptions, and play from separate devices with live state synchronisation. Rooms expire three hours after creation.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

## Deploy to Cloudflare

Authenticate Wrangler once with `npx wrangler login`, then deploy with:

```bash
npm run deploy
```

The build creates a Cloudflare Worker named `gausswerks-games`. Connect `games.gausswerks.co` from the Worker’s **Settings → Domains & Routes** page.
