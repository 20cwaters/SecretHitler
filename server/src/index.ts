import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createLobby,
  addPlayer,
  removePlayer,
  reconnectPlayer,
  startGame,
  markNightReady,
  nominateChancellor,
  castVote,
  presidentDiscard,
  chancellorDiscard,
  requestVeto,
  respondToVeto,
  investigatePlayer,
  acknowledgeInvestigation,
  pickSpecialElection,
  acknowledgePeek,
  executePlayer,
  buildPlayerView,
  returnToLobby,
  forceAdvance,
  systemMessage,
  beginExecutiveAction,
  continueAfterElection,
  continueAfterPolicyEnacted,
} from './gameLogic.ts';
import type { GameState, ChatMessage } from '../../shared/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Serve built client in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res, next) => {
  // Let socket.io and API routes pass through
  if (_req.url.startsWith('/socket.io')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ─── In-memory store ─────────────────────────────────────────────

const lobbies = new Map<string, GameState>();
const playerLobby = new Map<string, string>(); // socketId -> lobbyCode

// ─── Helpers ─────────────────────────────────────────────────────

function getLobby(socketId: string): GameState | null {
  const code = playerLobby.get(socketId);
  if (!code) return null;
  return lobbies.get(code) ?? null;
}

function broadcastState(game: GameState): void {
  for (const player of game.players) {
    if (player.connected) {
      const view = buildPlayerView(game, player.id);
      io.to(player.id).emit('game_state', view);
    }
  }
}

function emitError(socketId: string, message: string): void {
  io.to(socketId).emit('error', { message });
}

// ─── Phase transition timer for brief display phases ─────────────

function schedulePhaseTransition(game: GameState, delayMs: number, callback: () => void): void {
  setTimeout(() => {
    callback();
    broadcastState(game);
  }, delayMs);
}

// ─── Socket.IO Event Handlers ────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // ─── Create Lobby ────────────────────────────
  socket.on('create_lobby', ({ playerName }: { playerName: string }) => {
    if (!playerName?.trim()) {
      emitError(socket.id, 'Please enter a name');
      return;
    }

    const game = createLobby(socket.id, playerName.trim());
    lobbies.set(game.lobbyCode, game);
    playerLobby.set(socket.id, game.lobbyCode);
    socket.join(game.lobbyCode);

    socket.emit('lobby_created', { lobbyCode: game.lobbyCode });
    broadcastState(game);
  });

  // ─── Join Lobby ──────────────────────────────
  socket.on('join_lobby', ({ lobbyCode, playerName }: { lobbyCode: string; playerName: string }) => {
    if (!playerName?.trim()) {
      emitError(socket.id, 'Please enter a name');
      return;
    }
    if (!lobbyCode?.trim()) {
      emitError(socket.id, 'Please enter a lobby code');
      return;
    }

    const code = lobbyCode.trim().toUpperCase();
    const game = lobbies.get(code);
    if (!game) {
      emitError(socket.id, 'Lobby not found');
      return;
    }

    const error = addPlayer(game, socket.id, playerName.trim());
    if (error) {
      emitError(socket.id, error);
      return;
    }

    playerLobby.set(socket.id, code);
    socket.join(code);
    io.to(code).emit('player_joined', { playerName: playerName.trim() });
    broadcastState(game);
  });

  // ─── Reconnect ──────────────────────────────
  socket.on('reconnect_lobby', ({ lobbyCode, playerName }: { lobbyCode: string; playerName: string }) => {
    const code = lobbyCode.trim().toUpperCase();
    const game = lobbies.get(code);
    if (!game) {
      emitError(socket.id, 'Lobby not found');
      return;
    }

    const player = reconnectPlayer(game, socket.id, playerName.trim());
    if (!player) {
      // Try joining as new player
      const error = addPlayer(game, socket.id, playerName.trim());
      if (error) {
        emitError(socket.id, error);
        return;
      }
    }

    playerLobby.set(socket.id, code);
    socket.join(code);
    broadcastState(game);
  });

  // ─── Start Game ──────────────────────────────
  socket.on('start_game', () => {
    const game = getLobby(socket.id);
    if (!game) return;

    const player = game.players.find(p => p.id === socket.id);
    if (!player?.isHost) {
      emitError(socket.id, 'Only the host can start the game');
      return;
    }

    const error = startGame(game);
    if (error) {
      emitError(socket.id, error);
      return;
    }

    broadcastState(game);
  });

  // ─── Night Ready ─────────────────────────────
  socket.on('night_ready', () => {
    const game = getLobby(socket.id);
    if (!game) return;

    markNightReady(game, socket.id);
    broadcastState(game);
  });

  // ─── Nominate Chancellor ─────────────────────
  socket.on('nominate_chancellor', ({ playerId }: { playerId: string }) => {
    const game = getLobby(socket.id);
    if (!game) return;

    const error = nominateChancellor(game, socket.id, playerId);
    if (error) {
      emitError(socket.id, error);
      return;
    }

    broadcastState(game);
  });

  // ─── Cast Vote ───────────────────────────────
  socket.on('cast_vote', ({ vote }: { vote: 'ja' | 'nein' }) => {
    const game = getLobby(socket.id);
    if (!game) return;

    const error = castVote(game, socket.id, vote);
    if (error) {
      emitError(socket.id, error);
      return;
    }

    broadcastState(game);

    // Auto-advance from election_results after showing votes
    if (game.phase === 'election_results') {
      schedulePhaseTransition(game, 4000, () => {
        if (game.phase === 'election_results') {
          continueAfterElection(game);
          // If chaos caused a policy_enacted, schedule that continuation too
          if ((game.phase as string) === 'policy_enacted') {
            broadcastState(game);
            schedulePhaseTransition(game, 3000, () => {
              if (game.phase === 'policy_enacted') {
                continueAfterPolicyEnacted(game);
              }
            });
          }
        }
      });
    }
  });

  // ─── President Discard ───────────────────────
  socket.on('president_discard', ({ policyIndex }: { policyIndex: number }) => {
    const game = getLobby(socket.id);
    if (!game) return;

    const error = presidentDiscard(game, socket.id, policyIndex);
    if (error) {
      emitError(socket.id, error);
      return;
    }

    broadcastState(game);
  });

  // ─── Chancellor Discard ──────────────────────
  socket.on('chancellor_discard', ({ policyIndex }: { policyIndex: number }) => {
    const game = getLobby(socket.id);
    if (!game) return;

    const error = chancellorDiscard(game, socket.id, policyIndex);
    if (error) {
      emitError(socket.id, error);
      return;
    }

    broadcastState(game);

    // Show policy_enacted for 3 seconds, then continue
    if (game.phase === 'policy_enacted') {
      schedulePhaseTransition(game, 3000, () => {
        if (game.phase === 'policy_enacted') {
          continueAfterPolicyEnacted(game);
        }
      });
    }
  });

  // ─── Veto ────────────────────────────────────
  socket.on('request_veto', () => {
    const game = getLobby(socket.id);
    if (!game) return;

    const error = requestVeto(game, socket.id);
    if (error) {
      emitError(socket.id, error);
      return;
    }

    broadcastState(game);
  });

  socket.on('respond_veto', ({ accept }: { accept: boolean }) => {
    const game = getLobby(socket.id);
    if (!game) return;

    const error = respondToVeto(game, socket.id, accept);
    if (error) {
      emitError(socket.id, error);
      return;
    }

    broadcastState(game);

    // Veto accept may trigger chaos → policy_enacted
    if (game.phase === 'policy_enacted') {
      schedulePhaseTransition(game, 3000, () => {
        if (game.phase === 'policy_enacted') {
          continueAfterPolicyEnacted(game);
        }
      });
    }
  });

  // ─── Executive Actions ───────────────────────
  socket.on('investigate_player', ({ playerId }: { playerId: string }) => {
    const game = getLobby(socket.id);
    if (!game) return;

    const error = investigatePlayer(game, socket.id, playerId);
    if (error) {
      emitError(socket.id, error);
      return;
    }

    broadcastState(game);
  });

  socket.on('acknowledge_investigation', () => {
    const game = getLobby(socket.id);
    if (!game) return;

    const error = acknowledgeInvestigation(game, socket.id);
    if (error) {
      emitError(socket.id, error);
      return;
    }

    broadcastState(game);
  });

  socket.on('special_election_pick', ({ playerId }: { playerId: string }) => {
    const game = getLobby(socket.id);
    if (!game) return;

    const error = pickSpecialElection(game, socket.id, playerId);
    if (error) {
      emitError(socket.id, error);
      return;
    }

    broadcastState(game);
  });

  socket.on('acknowledge_peek', () => {
    const game = getLobby(socket.id);
    if (!game) return;

    const error = acknowledgePeek(game, socket.id);
    if (error) {
      emitError(socket.id, error);
      return;
    }

    broadcastState(game);
  });

  socket.on('execute_player', ({ playerId }: { playerId: string }) => {
    const game = getLobby(socket.id);
    if (!game) return;

    const error = executePlayer(game, socket.id, playerId);
    if (error) {
      emitError(socket.id, error);
      return;
    }

    broadcastState(game);
  });

  // ─── Chat ────────────────────────────────────
  socket.on('send_chat', ({ text }: { text: string }) => {
    const game = getLobby(socket.id);
    if (!game) return;

    const player = game.players.find(p => p.id === socket.id);
    if (!player) return;

    // Dead players are muted
    if (!player.isAlive && game.phase !== 'lobby' && game.phase !== 'game_over') {
      emitError(socket.id, 'Dead players cannot chat');
      return;
    }

    if (!text?.trim()) return;

    const msg: ChatMessage = {
      id: Math.random().toString(36).slice(2, 10),
      playerId: player.id,
      playerName: player.name,
      text: text.trim().slice(0, 500),
      timestamp: Date.now(),
      isSystem: false,
    };

    game.chatMessages.push(msg);
    // Keep last 200 messages
    if (game.chatMessages.length > 200) {
      game.chatMessages = game.chatMessages.slice(-200);
    }

    // Broadcast to all in lobby
    for (const p of game.players) {
      if (p.connected) {
        io.to(p.id).emit('chat_message', msg);
      }
    }
  });

  // ─── Host Admin ──────────────────────────────
  socket.on('kick_player', ({ playerId }: { playerId: string }) => {
    const game = getLobby(socket.id);
    if (!game) return;

    const host = game.players.find(p => p.id === socket.id);
    if (!host?.isHost) {
      emitError(socket.id, 'Only the host can kick players');
      return;
    }

    if (playerId === socket.id) {
      emitError(socket.id, 'Cannot kick yourself');
      return;
    }

    const target = game.players.find(p => p.id === playerId);
    if (!target) return;

    const targetName = target.name;
    removePlayer(game, playerId);
    playerLobby.delete(playerId);

    // Force disconnect the kicked player
    const targetSocket = io.sockets.sockets.get(playerId);
    if (targetSocket) {
      targetSocket.emit('error', { message: 'You have been kicked from the lobby' });
      targetSocket.leave(game.lobbyCode);
    }

    io.to(game.lobbyCode).emit('player_left', { playerName: targetName });
    broadcastState(game);
  });

  socket.on('end_game', () => {
    const game = getLobby(socket.id);
    if (!game) return;

    const host = game.players.find(p => p.id === socket.id);
    if (!host?.isHost) {
      emitError(socket.id, 'Only the host can end the game');
      return;
    }

    game.phase = 'game_over';
    game.winner = null;
    game.winCondition = null;
    systemMessage(game, 'The host ended the game.');
    broadcastState(game);
  });

  socket.on('return_to_lobby', () => {
    const game = getLobby(socket.id);
    if (!game) return;

    const host = game.players.find(p => p.id === socket.id);
    if (!host?.isHost) {
      emitError(socket.id, 'Only the host can return to lobby');
      return;
    }

    returnToLobby(game);
    broadcastState(game);
  });

  socket.on('force_advance', () => {
    const game = getLobby(socket.id);
    if (!game) return;

    const host = game.players.find(p => p.id === socket.id);
    if (!host?.isHost) {
      emitError(socket.id, 'Only the host can force advance');
      return;
    }

    forceAdvance(game);
    broadcastState(game);
  });

  // ─── Disconnect ──────────────────────────────
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    const game = getLobby(socket.id);
    if (!game) return;

    removePlayer(game, socket.id);
    playerLobby.delete(socket.id);

    // Clean up empty lobbies
    if (game.players.every(p => !p.connected)) {
      lobbies.delete(game.lobbyCode);
      console.log(`Lobby ${game.lobbyCode} deleted (empty)`);
    } else {
      broadcastState(game);
    }
  });
});

// ─── Start Server ────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Secret Hitler server running on port ${PORT}`);
});
