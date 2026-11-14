<div align="center">

![Mikasa Ludo](https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,27&height=200&section=header&text=Mikasa%20Ludo&fontSize=64&fontColor=ffffff&animation=fadeIn)

<img src="public/assets/mikasa-mascot.jpg" width="560" alt="Mikasa playing Ludo" />

#### 𝕄𝕚𝕜𝕒𝕤𝕒 𝕃𝕦𝕕𝕠

![Typing SVG](https://readme-typing-svg.demolab.com?font=Lobster&size=26&duration=3000&pause=1000&color=FF6B9D&center=true&vCenter=true&width=640&lines=Roll+the+dice%2C+race+your+friends;Fair+server-side+dice+every+turn;Share+your+victory+as+an+image)

[![Telegram](https://img.shields.io/badge/Telegram-@Ig__MikasaBot-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/Ig_MikasaBot)
[![Play Now](https://img.shields.io/badge/🎲%20Play%20Now-Open%20Mini%20App-FF6B9D?style=for-the-badge&logoColor=white)](https://t.me/Ig_MikasaBot/ludo)
![Node](https://img.shields.io/badge/Node-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![WebSocket](https://img.shields.io/badge/WebSocket-live-7C3AED?style=for-the-badge)

</div>

---

## 🎲 About

Mikasa Ludo is a full-stack Ludo game with live multiplayer, playable as a Telegram Mini App or in the browser. One Render Web Service serves the Vite-built frontend, the `/api/*` endpoints, and the `/ws` multiplayer WebSocket, all on the same origin.

## ✨ Features

- **Live multiplayer rooms.** Real-time play over WebSocket, with lobbies and room codes.
- **Fair dice.** Every roll is generated on the server with `crypto.randomInt`. No hidden streak or luck adjustments. See [FAIRNESS.md](FAIRNESS.md).
- **Turn timer with auto-play.** 20 seconds per turn. A timed-out turn is played automatically, and five in a row removes the player.
- **Chat and reactions.** In-game chat, quick reactions, and big emoji moments.
- **Dark and light boards.** Switch the look of the board to match your mood.
- **Custom tokens.** Personalise your pieces.
- **Match history and profiles.** See past games and your player card.
- **Shareable victory images.** Finish a match and share the result as an image in Telegram.
- **Spectators.** Watch rooms you are not part of.

## 🧰 Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript (run with `tsx`) |
| Realtime | WebSocket on `/ws` |
| Platform | Telegram Mini App, Render |

## 🚀 Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

Fairness regression check: `npm run test:fairness`

## ☁️ Deploy to Render

1. Push this folder to a GitHub repository. `package.json` and `server.ts` must be in the root.
2. In Render, choose **New → Web Service** and connect the repository. The included `render.yaml` sets these for you:
   - **Runtime:** Node
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
3. Deploy. Render sets `PORT` automatically.

> Keep this as **one instance**. Live rooms are held in memory, so multiple instances would not share games.

## ⚙️ Environment variables

Nothing is required for guest play.

| Variable | Default | Purpose |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | none | Validates Telegram Mini App logins and fetches profile photos. Keep it server-side. |
| `BOT_USERNAME` | `Ig_MikasaBot` | Bot handle without the `@` |
| `MINIAPP_SHORT_NAME` | `ludo` | Mini App short name from BotFather |
| `PUBLIC_URL` | none | Your public domain, used for shared result links |
| `VITE_BOT_USERNAME`, `VITE_MINIAPP_SHORT`, `VITE_PUBLIC_URL` | same defaults | Build-time versions for the frontend |

## 💾 Hosting notes

- Profiles and match history are saved to `data/ludo-db.json`. Render's filesystem is ephemeral, so that data resets on redeploy unless you add a persistent disk or database.
- Free instances can spin down after inactivity. The first request after that is a little slower.
- WebSocket traffic uses the same hostname at `/ws`, so no second service is needed.

## 🤖 Telegram

Open **[@Ig_MikasaBot](https://t.me/Ig_MikasaBot)**, press **Start** once, then launch the **Ludo** Mini App. Players who have opened the bot get their profile photo in the app.

---

<div align="center">

*Roll the dice. Trust the dice.*

</div>
