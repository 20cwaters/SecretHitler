import { useState } from 'react';
import { socket } from '../socket';
import type { PlayerView } from '@shared/types';

interface Props {
  gameState: PlayerView;
}

export default function HostAdmin({ gameState }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4 card border-yellow-700/30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-sm font-semibold text-yellow-400"
      >
        <span>Host Admin Panel</span>
        <span className="text-xs text-gray-500">{isOpen ? '▲ Hide' : '▼ Show'}</span>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-3 fade-in">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Game Controls</p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                if (confirm('Force advance to next phase?')) {
                  socket.emit('force_advance');
                }
              }}
              className="px-3 py-2 bg-yellow-800/30 border border-yellow-600/30 rounded-lg
                text-sm text-yellow-300 hover:bg-yellow-700/30 transition-colors"
            >
              Force Advance Phase
            </button>
            <button
              onClick={() => {
                if (confirm('End the game early? All roles will be revealed.')) {
                  socket.emit('end_game');
                }
              }}
              className="btn-danger text-sm"
            >
              End Game
            </button>
          </div>

          {/* Player management */}
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-4">Players</p>
          <div className="space-y-1">
            {gameState.players.map(player => (
              <div
                key={player.id}
                className="flex items-center justify-between px-3 py-2 bg-board-bg rounded-lg text-sm"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${player.connected ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span>{player.name}</span>
                  {!player.isAlive && <span className="text-xs text-red-400">Dead</span>}
                  {!player.connected && <span className="text-xs text-yellow-400">Disconnected</span>}
                </div>
                {player.id !== gameState.myId && (
                  <button
                    onClick={() => {
                      if (confirm(`Kick ${player.name}?`)) {
                        socket.emit('kick_player', { playerId: player.id });
                      }
                    }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Kick
                  </button>
                )}
              </div>
            ))}
          </div>

          <p className="text-[10px] text-gray-600 mt-2">
            Admin View — only visible to the host
          </p>
        </div>
      )}
    </div>
  );
}
