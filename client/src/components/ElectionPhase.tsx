import { socket } from '../socket';
import type { PlayerView } from '@shared/types';

interface Props {
  gameState: PlayerView;
}

export default function ElectionPhase({ gameState }: Props) {
  const self = gameState.players.find(p => p.id === gameState.myId);
  const chancellor = gameState.players.find(p => p.id === gameState.chancellorCandidateId);
  const president = gameState.players.find(p => p.id === gameState.presidentId);

  const canVote = self?.isAlive && !gameState.hasVoted;
  const votedCount = gameState.players.filter(p => p.isAlive).length;

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold mb-2">Vote on the Government</h3>
      <p className="text-gray-400 text-sm mb-6">
        <span className="text-yellow-400 font-semibold">{president?.name}</span> (President) +{' '}
        <span className="text-purple-400 font-semibold">{chancellor?.name}</span> (Chancellor)
      </p>

      {canVote ? (
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => socket.emit('cast_vote', { vote: 'ja' })}
            className="px-8 py-4 bg-green-800/60 border-2 border-green-500 rounded-xl
              text-xl font-black text-green-300 hover:bg-green-700/60 transition-all
              hover:scale-105 active:scale-95"
          >
            JA!
          </button>
          <button
            onClick={() => socket.emit('cast_vote', { vote: 'nein' })}
            className="px-8 py-4 bg-red-800/60 border-2 border-red-500 rounded-xl
              text-xl font-black text-red-300 hover:bg-red-700/60 transition-all
              hover:scale-105 active:scale-95"
          >
            NEIN
          </button>
        </div>
      ) : gameState.hasVoted ? (
        <div>
          <p className="text-gray-400 mb-2">Vote cast! Waiting for others...</p>
          <div className="flex justify-center gap-1">
            {gameState.players.filter(p => p.isAlive).map(p => (
              <div
                key={p.id}
                className="w-3 h-3 rounded-full bg-gray-600"
                title={p.name}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-gray-500">You cannot vote (dead)</p>
      )}
    </div>
  );
}
