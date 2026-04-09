import { socket } from '../socket';
import type { PlayerView } from '@shared/types';
import Chat from './Chat';

interface Props {
  gameState: PlayerView;
  onLeave: () => void;
}

export default function Lobby({ gameState, onLeave }: Props) {
  const canStart = gameState.isHost && gameState.players.length >= 5;
  const shareUrl = `${window.location.origin}?code=${gameState.lobbyCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 pt-8">
      <div className="card max-w-lg w-full fade-in">
        <h2 className="text-3xl font-bold text-center mb-2">Lobby</h2>

        {/* Room code */}
        <div className="bg-board-bg rounded-lg p-4 text-center mb-6">
          <p className="text-gray-400 text-sm mb-1">Room Code</p>
          <p className="text-4xl font-mono font-bold tracking-[0.3em] text-liberal">
            {gameState.lobbyCode}
          </p>
          <button
            onClick={copyLink}
            className="text-xs text-gray-400 hover:text-liberal mt-2 transition-colors"
          >
            Copy invite link
          </button>
        </div>

        {/* Player list */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">
            Players ({gameState.players.length}/10)
          </h3>
          <div className="space-y-2">
            {gameState.players.map(player => (
              <div
                key={player.id}
                className={`flex items-center justify-between px-4 py-2 rounded-lg
                  ${player.id === gameState.myId ? 'bg-board-surface border border-liberal/30' : 'bg-board-bg'}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${player.connected ? 'bg-green-400' : 'bg-gray-500'}`} />
                  <span className="font-medium">{player.name}</span>
                  {player.isHost && (
                    <span className="text-xs bg-yellow-600/30 text-yellow-400 px-2 py-0.5 rounded">
                      HOST
                    </span>
                  )}
                  {player.id === gameState.myId && (
                    <span className="text-xs text-gray-500">(you)</span>
                  )}
                </div>
                {gameState.isHost && player.id !== gameState.myId && (
                  <button
                    onClick={() => socket.emit('kick_player', { playerId: player.id })}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Kick
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        {gameState.players.length < 5 && (
          <p className="text-center text-yellow-400 text-sm mb-4">
            Need {5 - gameState.players.length} more player{5 - gameState.players.length > 1 ? 's' : ''} to start
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          {gameState.isHost && (
            <button
              onClick={() => socket.emit('start_game')}
              disabled={!canStart}
              className="btn-primary text-lg px-8 py-3"
            >
              Start Game
            </button>
          )}
          <button onClick={onLeave} className="btn-danger">
            Leave
          </button>
        </div>
      </div>

      {/* Chat */}
      <div className="max-w-lg w-full mt-4">
        <Chat gameState={gameState} />
      </div>
    </div>
  );
}
