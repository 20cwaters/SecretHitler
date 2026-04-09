import { socket } from '../socket';
import type { PlayerView } from '@shared/types';

interface Props {
  gameState: PlayerView;
}

const winMessages: Record<string, string> = {
  liberal_policies: 'Five Liberal policies have been enacted!',
  hitler_executed: 'Hitler has been executed!',
  fascist_policies: 'Six Fascist policies have been enacted!',
  hitler_chancellor: 'Hitler was elected Chancellor!',
};

export default function GameOver({ gameState }: Props) {
  const isWinner = gameState.winner
    ? gameState.myTeam === gameState.winner
    : false;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-lg w-full text-center fade-in">
        {gameState.winner ? (
          <>
            <h2 className={`text-4xl font-black mb-2 ${
              gameState.winner === 'liberal' ? 'text-liberal' : 'text-fascist'
            }`}>
              {gameState.winner === 'liberal' ? 'LIBERALS' : 'FASCISTS'} WIN!
            </h2>
            <p className="text-gray-400 mb-2">
              {gameState.winCondition ? winMessages[gameState.winCondition] : ''}
            </p>
            <p className={`text-lg font-bold mb-6 ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
              {isWinner ? 'You won!' : 'You lost!'}
            </p>
          </>
        ) : (
          <h2 className="text-3xl font-bold mb-6 text-gray-400">Game Ended</h2>
        )}

        {/* Reveal all roles */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-300">All Roles Revealed</h3>
          <div className="space-y-2">
            {gameState.players.map(player => {
              const roleColor = player.role === 'liberal'
                ? 'text-liberal'
                : player.role === 'hitler'
                  ? 'text-hitler'
                  : 'text-fascist';
              const roleLabel = player.role === 'liberal'
                ? 'Liberal'
                : player.role === 'hitler'
                  ? 'HITLER'
                  : 'Fascist';

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between px-4 py-2 rounded-lg
                    ${player.role === 'hitler'
                      ? 'bg-orange-900/20 border border-orange-700/30'
                      : player.team === 'liberal'
                        ? 'bg-blue-900/20 border border-blue-700/30'
                        : 'bg-red-900/20 border border-red-700/30'
                    }
                    ${!player.isAlive ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{player.name}</span>
                    {player.id === gameState.myId && (
                      <span className="text-xs text-gray-500">(you)</span>
                    )}
                    {!player.isAlive && (
                      <span className="text-xs text-red-400">Dead</span>
                    )}
                  </div>
                  <span className={`font-bold ${roleColor}`}>{roleLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Host actions */}
        {gameState.isHost && (
          <button
            onClick={() => socket.emit('return_to_lobby')}
            className="btn-primary text-lg px-8 py-3"
          >
            Return to Lobby
          </button>
        )}

        {!gameState.isHost && (
          <p className="text-gray-500 text-sm">Waiting for host to return to lobby...</p>
        )}
      </div>
    </div>
  );
}
