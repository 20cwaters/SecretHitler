import { socket } from '../socket';
import type { PlayerView, PolicyType } from '@shared/types';

interface Props {
  gameState: PlayerView;
}

export default function LegislativePhase({ gameState }: Props) {
  const isPresident = gameState.myId === gameState.presidentId;
  const isChancellor = gameState.myId === gameState.chancellorCandidateId;
  const president = gameState.players.find(p => p.id === gameState.presidentId);
  const chancellor = gameState.players.find(p => p.id === gameState.chancellorCandidateId);

  // President discarding
  if (gameState.phase === 'legislative_president') {
    if (isPresident && gameState.presidentialPolicies) {
      return (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">President's Choice</h3>
          <p className="text-gray-400 text-sm mb-6">
            Discard one policy. The remaining two go to the Chancellor.
          </p>
          <div className="flex gap-4 justify-center">
            {gameState.presidentialPolicies.map((policy, i) => (
              <PolicyCard
                key={i}
                policy={policy}
                onClick={() => socket.emit('president_discard', { policyIndex: i })}
                label="Discard"
              />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-4">
        <h3 className="text-xl font-bold mb-2">Legislative Session</h3>
        <p className="text-gray-400">
          <span className="text-yellow-400 font-semibold">{president?.name}</span> is reviewing 3 policies...
        </p>
      </div>
    );
  }

  // Chancellor discarding
  if (gameState.phase === 'legislative_chancellor') {
    if (isChancellor && gameState.chancellorPolicies) {
      const vetoUnlocked = gameState.fascistPoliciesEnacted >= 5;

      return (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">Chancellor's Choice</h3>
          <p className="text-gray-400 text-sm mb-6">
            Choose one policy to enact.
          </p>
          <div className="flex gap-4 justify-center mb-4">
            {gameState.chancellorPolicies.map((policy, i) => (
              <PolicyCard
                key={i}
                policy={policy}
                onClick={() => socket.emit('chancellor_discard', { policyIndex: i === 0 ? 1 : 0 })}
                label="Enact"
              />
            ))}
          </div>
          {vetoUnlocked && (
            <button
              onClick={() => socket.emit('request_veto')}
              className="btn-danger mt-2"
            >
              Propose Veto
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="text-center py-4">
        <h3 className="text-xl font-bold mb-2">Legislative Session</h3>
        <p className="text-gray-400">
          <span className="text-purple-400 font-semibold">{chancellor?.name}</span> is choosing a policy to enact...
        </p>
      </div>
    );
  }

  // Veto requested
  if (gameState.phase === 'veto_requested') {
    if (isPresident) {
      return (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2 text-yellow-400">Veto Proposed!</h3>
          <p className="text-gray-400 text-sm mb-6">
            The Chancellor wants to veto the entire agenda. Do you agree?
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => socket.emit('respond_veto', { accept: true })}
              className="btn-danger px-8 py-3 text-lg"
            >
              Accept Veto
            </button>
            <button
              onClick={() => socket.emit('respond_veto', { accept: false })}
              className="btn-primary px-8 py-3 text-lg"
            >
              Reject Veto
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-4">
        <h3 className="text-xl font-bold mb-2 text-yellow-400">Veto Proposed!</h3>
        <p className="text-gray-400">
          Waiting for <span className="text-yellow-400 font-semibold">{president?.name}</span> to respond to the veto...
        </p>
      </div>
    );
  }

  return null;
}

// ─── Policy Card ─────────────────────────────────────────────────

function PolicyCard({
  policy,
  onClick,
  label,
}: {
  policy: PolicyType;
  onClick: () => void;
  label: string;
}) {
  const isLiberal = policy === 'liberal';

  return (
    <button
      onClick={onClick}
      className={`w-24 h-36 rounded-xl flex flex-col items-center justify-center gap-2
        transition-all hover:scale-105 active:scale-95 cursor-pointer
        ${isLiberal
          ? 'policy-liberal hover:shadow-lg hover:shadow-blue-500/30'
          : 'policy-fascist hover:shadow-lg hover:shadow-red-500/30'
        }`}
    >
      <span className="text-3xl">{isLiberal ? '🕊️' : '☠️'}</span>
      <span className={`text-xs font-bold uppercase ${isLiberal ? 'text-blue-200' : 'text-red-200'}`}>
        {policy}
      </span>
      <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded text-white/70">
        {label}
      </span>
    </button>
  );
}
