import { socket } from '../socket';
import type { PlayerView } from '@shared/types';

interface Props {
  gameState: PlayerView;
}

export default function ExecutivePhase({ gameState }: Props) {
  const isPresident = gameState.myId === gameState.presidentId;
  const president = gameState.players.find(p => p.id === gameState.presidentId);
  const power = gameState.pendingExecutiveAction;

  // ─── Investigation Result ──────────────────────
  if (gameState.phase === 'investigate' && isPresident && gameState.investigationResult) {
    return (
      <div className="text-center">
        <h3 className="text-xl font-bold mb-4">Investigation Result</h3>
        <div className={`inline-block px-8 py-6 rounded-xl mb-4 ${
          gameState.investigationResult === 'liberal'
            ? 'bg-blue-900/40 border-2 border-liberal'
            : 'bg-red-900/40 border-2 border-fascist'
        }`}>
          <p className="text-sm text-gray-400 mb-1">Party Membership</p>
          <p className={`text-3xl font-black ${
            gameState.investigationResult === 'liberal' ? 'text-liberal' : 'text-fascist'
          }`}>
            {gameState.investigationResult.toUpperCase()}
          </p>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          You may now publicly claim whatever you wish.
        </p>
        <button
          onClick={() => socket.emit('acknowledge_investigation')}
          className="btn-primary"
        >
          Done
        </button>
      </div>
    );
  }

  // ─── Policy Peek ───────────────────────────────
  if (gameState.phase === 'policy_peek' && isPresident && gameState.policyPeekCards) {
    return (
      <div className="text-center">
        <h3 className="text-xl font-bold mb-4">Policy Peek</h3>
        <p className="text-gray-400 text-sm mb-4">The top 3 policies in the draw pile:</p>
        <div className="flex gap-3 justify-center mb-6">
          {gameState.policyPeekCards.map((policy, i) => (
            <div
              key={i}
              className={`w-16 h-24 rounded-xl flex items-center justify-center text-2xl
                ${policy === 'liberal' ? 'policy-liberal' : 'policy-fascist'}`}
            >
              {policy === 'liberal' ? '🕊️' : '☠️'}
            </div>
          ))}
        </div>
        <p className="text-gray-500 text-xs mb-4">These will be drawn next. Don't reveal them!</p>
        <button
          onClick={() => socket.emit('acknowledge_peek')}
          className="btn-primary"
        >
          Done
        </button>
      </div>
    );
  }

  // ─── President needs to pick a target ──────────
  if (isPresident && gameState.phase === 'executive_action') {
    const powerConfig = getPowerConfig(power);

    const eligibleTargets = gameState.players.filter(p => {
      if (!p.isAlive) return false;
      if (p.id === gameState.myId) return false;
      if (power === 'investigate' && p.hasBeenInvestigated) return false;
      return true;
    });

    return (
      <div>
        <h3 className="text-xl font-bold mb-2 text-center">{powerConfig.title}</h3>
        <p className="text-gray-400 text-sm text-center mb-4">{powerConfig.description}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {eligibleTargets.map(player => (
            <button
              key={player.id}
              onClick={() => {
                if (power === 'investigate') {
                  socket.emit('investigate_player', { playerId: player.id });
                } else if (power === 'special_election') {
                  socket.emit('special_election_pick', { playerId: player.id });
                } else if (power === 'execution') {
                  if (confirm(`Are you sure you want to execute ${player.name}?`)) {
                    socket.emit('execute_player', { playerId: player.id });
                  }
                }
              }}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-all
                ${power === 'execution'
                  ? 'bg-red-900/40 border border-red-500/50 hover:border-red-400 hover:bg-red-800/40'
                  : 'bg-board-surface border border-liberal/50 hover:border-liberal hover:bg-blue-900'
                } cursor-pointer`}
            >
              {player.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Waiting view for non-presidents ───────────
  const powerConfig = getPowerConfig(power);
  return (
    <div className="text-center py-4">
      <h3 className="text-xl font-bold mb-2">{powerConfig.title}</h3>
      <p className="text-gray-400">
        Waiting for <span className="text-yellow-400 font-semibold">{president?.name}</span> to use their executive power...
      </p>
    </div>
  );
}

function getPowerConfig(power: string | null) {
  switch (power) {
    case 'investigate':
      return {
        title: 'Investigate Loyalty',
        description: 'Choose a player to investigate their Party Membership card.',
      };
    case 'special_election':
      return {
        title: 'Special Election',
        description: 'Choose the next Presidential Candidate.',
      };
    case 'policy_peek':
      return {
        title: 'Policy Peek',
        description: 'View the top 3 policies in the draw pile.',
      };
    case 'execution':
      return {
        title: 'Execution',
        description: 'Choose a player to execute. If you kill Hitler, Liberals win!',
      };
    default:
      return {
        title: 'Executive Action',
        description: 'The President has an executive power to use.',
      };
  }
}
