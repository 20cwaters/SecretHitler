# Secret Hitler — Online Multiplayer

A real-time multiplayer web app for playing [Secret Hitler](https://www.secrethitler.com/) with 5–10 players. Each player joins from their own device; the server handles all game state, role secrecy, voting, and rule enforcement.

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + Socket.IO
- **State:** In-memory (keyed by lobby code)

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Start both server and client in dev mode
npm run dev
```

- **Client:** http://localhost:5173
- **Server:** http://localhost:3001

## How to Play

1. One player creates a lobby and shares the room code (or invite link)
2. Other players join using the code
3. Host starts the game when 5–10 players are connected
4. Each player secretly views their role (Liberal, Fascist, or Hitler)
5. Players take turns as President, nominating a Chancellor
6. Everyone votes on the proposed government
7. If elected, President and Chancellor enact policies through a hidden legislative process
8. Fascist policies may grant the President executive powers
9. The game continues until a team wins

## Win Conditions

| Team | Condition |
|------|-----------|
| **Liberals** | Enact 5 Liberal policies |
| **Liberals** | Execute Hitler |
| **Fascists** | Enact 6 Fascist policies |
| **Fascists** | Elect Hitler as Chancellor after 3+ Fascist policies |

## Role Distribution

| Players | Liberals | Fascists | Hitler |
|---------|----------|----------|--------|
| 5 | 3 | 1 | 1 |
| 6 | 4 | 1 | 1 |
| 7 | 4 | 2 | 1 |
| 8 | 5 | 2 | 1 |
| 9 | 5 | 3 | 1 |
| 10 | 6 | 3 | 1 |

## Night Phase Rules

- **Fascists** always see each other and know who Hitler is
- **Hitler** sees the Fascists only in 5–6 player games
- **Liberals** have no information

## Executive Powers (Fascist Track)

| Slot | 5–6 Players | 7–8 Players | 9–10 Players |
|------|-------------|-------------|--------------|
| 1 | — | Investigate | Investigate |
| 2 | — | Investigate | Investigate |
| 3 | Policy Peek | Special Election | Special Election |
| 4 | Execution | Execution | Execution |
| 5 | Execution | Execution | Execution |

Veto power unlocks after the 5th Fascist policy is enacted.

## Project Structure

```
├── client/          # React frontend (Vite)
│   └── src/
│       ├── components/  # All UI components
│       ├── socket.ts    # Socket.IO client
│       └── App.tsx      # Root component & routing
├── server/          # Node.js backend
│   └── src/
│       ├── index.ts     # Express + Socket.IO server
│       └── gameLogic.ts # State machine & game rules
├── shared/          # Shared TypeScript types
│   └── types.ts
└── package.json     # Root scripts
```

## Key Design Decisions

- **Server-authoritative:** All game logic runs on the server. Clients send intents; the server validates and broadcasts filtered state.
- **Per-player filtering:** The server never sends hidden information to unauthorized clients. Each player receives a `PlayerView` tailored to what they should know.
- **Reconnection:** Players can rejoin with the same name + lobby code to restore their session.
- **No database:** All state is in-memory, keyed by lobby code. Suitable for an MVP / game night.

## Official Rules

See the [official Secret Hitler rules](https://www.secrethitler.com/assets/Secret_Hitler_Rules.pdf) for the complete rulebook.

*Secret Hitler is designed by Mike Boxleiter, Tommy Maranges, and Max Temkin. This is a fan-made digital implementation for personal use.*
