import type { PlayerView } from '@shared/types';

interface Props {
  gameState: PlayerView;
  selectable?: boolean;
  selectableIds?: string[];
  onSelect?: (playerId: string) => void;
  label?: string;
}

export default function PlayerList({ gameState, selectable, selectableIds, onSelect, label }: Props) {
  const president = gameState.presidentId;
  const chancellor = gameState.chancellorCandidateId;

  return (
    <div>
      {label && (
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {label}
        </h3>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {gameState.players.map(player => {
          const isSelectable = selectable && selectableIds?.includes(player.id);
          const isPresident = player.id === president;
          const isChancellor = player.id === chancellor;
          const isDead = !player.isAlive;

          return (
            <button
              key={player.id}
              onClick={() => isSelectable && onSelect?.(player.id)}
              disabled={!isSelectable}
              className={`relative px-3 py-2 rounded-lg text-sm font-medium text-left
                transition-all duration-200
                ${isDead
                  ? 'bg-gray-800/50 text-gray-600 line-through opacity-60'
                  : isSelectable
                    ? 'bg-board-surface border border-liberal/50 hover:border-liberal cursor-pointer hover:bg-blue-900'
                    : 'bg-board-bg border border-gray-700/50'
                }
                ${player.id === gameState.myId && !isDead ? 'ring-1 ring-liberal/30' : ''}
              `}
            >
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isDead ? 'bg-gray-600' : player.connected ? 'bg-green-400' : 'bg-yellow-500'
                }`} />
                <span className="truncate">{player.name}</span>
              </div>

              {/* Badges */}
              <div className="flex gap-1 mt-1 flex-wrap">
                {isPresident && (
                  <span className="text-[10px] bg-yellow-600/40 text-yellow-300 px-1.5 py-0.5 rounded">
                    P
                  </span>
                )}
                {isChancellor && (
                  <span className="text-[10px] bg-purple-600/40 text-purple-300 px-1.5 py-0.5 rounded">
                    C
                  </span>
                )}
                {player.id === gameState.myId && (
                  <span className="text-[10px] text-gray-500">You</span>
                )}
                {isDead && (
                  <span className="text-[10px] text-red-400">Dead</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
