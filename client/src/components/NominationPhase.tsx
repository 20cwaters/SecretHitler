import { socket } from '../socket';
import type { PlayerView } from '@shared/types';

interface Props {
  gameState: PlayerView;
}

export default function NominationPhase({ gameState }: Props) {
  const isPresident = gameState.myId === gameState.presidentId;
  const president = gameState.players.find(p => p.id === gameState.presidentId);

  // Build eligible list
  const eligible = getEligibleChancellorIds(gameState);

  if (!isPresident) {
    return (
      <div className="text-center py-4">
        <h3 className="text-xl font-bold mb-2">Chancellor Nomination</h3>
        <p className="text-gray-400">
          Waiting for <span className="text-yellow-400 font-semibold">{president?.name}</span> to nominate a Chancellor...
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-bold mb-2 text-center">Nominate a Chancellor</h3>
      <p className="text-gray-400 text-sm text-center mb-4">
        Choose a player to be your Chancellor candidate.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {gameState.players.map(player => {
          const isEligible = eligible.includes(player.id);
          if (player.id === gameState.myId || !player.isAlive) return null;

          return (
            <button
              key={player.id}
              onClick={() => socket.emit('nominate_chancellor', { playerId: player.id })}
              disabled={!isEligible}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-all
                ${isEligible
                  ? 'bg-purple-900/40 border border-purple-500/50 hover:border-purple-400 hover:bg-purple-800/40 cursor-pointer'
                  : 'bg-gray-800/50 border border-gray-700/30 text-gray-500 cursor-not-allowed'
                }`}
            >
              {player.name}
              {!isEligible && (
                <span className="block text-[10px] text-gray-600 mt-1">Ineligible</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getEligibleChancellorIds(gameState: PlayerView): string[] {
  const aliveCount = gameState.players.filter(p => p.isAlive).length;

  return gameState.players
    .filter(p => {
      if (!p.isAlive) return false;
      if (p.id === gameState.presidentId) return false;
      if (p.id === gameState.lastElectedChancellorId) return false;
      if (aliveCount > 5 && p.id === gameState.lastElectedPresidentId) return false;
      return true;
    })
    .map(p => p.id);
}
