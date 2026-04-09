import { socket } from '../socket';
import type { PlayerView } from '@shared/types';
import PolicyTrack from './PolicyTrack';
import ElectionTracker from './ElectionTracker';
import PlayerList from './PlayerList';
import NominationPhase from './NominationPhase';
import ElectionPhase from './ElectionPhase';
import LegislativePhase from './LegislativePhase';
import ExecutivePhase from './ExecutivePhase';
import Chat from './Chat';
import HostAdmin from './HostAdmin';

interface Props {
  gameState: PlayerView;
}

export default function GameBoard({ gameState }: Props) {
  const president = gameState.players.find(p => p.id === gameState.presidentId);
  const chancellor = gameState.players.find(p => p.id === gameState.chancellorCandidateId);
  const self = gameState.players.find(p => p.id === gameState.myId);

  const phaseLabel: Record<string, string> = {
    nomination: 'Chancellor Nomination',
    election: 'Election - Vote!',
    election_results: 'Election Results',
    legislative_president: 'Legislative Session',
    legislative_chancellor: 'Legislative Session',
    veto_requested: 'Veto Proposed',
    policy_enacted: 'Policy Enacted!',
    executive_action: 'Executive Action',
    investigate: 'Investigation',
    special_election: 'Special Election',
    policy_peek: 'Policy Peek',
    execution: 'Execution',
  };

  return (
    <div className="min-h-screen p-3 sm:p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Secret Hitler</h1>
          <p className="text-xs text-gray-500 font-mono">Room: {gameState.lobbyCode}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">
            You are{' '}
            <span className={gameState.myTeam === 'liberal' ? 'text-liberal font-bold' : 'text-fascist font-bold'}>
              {gameState.myRole === 'hitler' ? 'Hitler' : gameState.myTeam === 'liberal' ? 'Liberal' : 'Fascist'}
            </span>
          </p>
          {!self?.isAlive && (
            <p className="text-xs text-red-400">You are dead</p>
          )}
        </div>
      </div>

      {/* Phase indicator */}
      <div className="bg-board-card rounded-lg px-4 py-2 mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-yellow-400">
          {phaseLabel[gameState.phase] || gameState.phase}
        </span>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>Draw: {gameState.drawPileCount}</span>
          <span>Discard: {gameState.discardPileCount}</span>
          <ElectionTracker count={gameState.electionTracker} />
        </div>
      </div>

      {/* Current government */}
      {president && (
        <div className="flex gap-4 mb-4 text-sm">
          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg px-3 py-2 flex-1 text-center">
            <span className="text-yellow-400 text-xs block">President</span>
            <span className="font-semibold">{president.name}</span>
          </div>
          {chancellor && (
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg px-3 py-2 flex-1 text-center">
              <span className="text-purple-400 text-xs block">Chancellor</span>
              <span className="font-semibold">{chancellor.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Policy tracks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <PolicyTrack type="liberal" enacted={gameState.liberalPoliciesEnacted} />
        <PolicyTrack
          type="fascist"
          enacted={gameState.fascistPoliciesEnacted}
          fascistTrackPowers={gameState.fascistTrackPowers}
        />
      </div>

      {/* Main game phase content */}
      <div className="card mb-4 fade-in">
        {gameState.phase === 'nomination' && (
          <NominationPhase gameState={gameState} />
        )}
        {gameState.phase === 'election' && (
          <ElectionPhase gameState={gameState} />
        )}
        {gameState.phase === 'election_results' && (
          <ElectionResults gameState={gameState} />
        )}
        {(gameState.phase === 'legislative_president' ||
          gameState.phase === 'legislative_chancellor' ||
          gameState.phase === 'veto_requested') && (
          <LegislativePhase gameState={gameState} />
        )}
        {gameState.phase === 'policy_enacted' && (
          <PolicyEnacted gameState={gameState} />
        )}
        {(gameState.phase === 'executive_action' ||
          gameState.phase === 'investigate' ||
          gameState.phase === 'policy_peek' ||
          gameState.phase === 'execution') && (
          <ExecutivePhase gameState={gameState} />
        )}
      </div>

      {/* Player list */}
      <div className="card mb-4">
        <PlayerList gameState={gameState} label="Players" />
      </div>

      {/* Chat */}
      <Chat gameState={gameState} />

      {/* Host admin */}
      {gameState.isHost && <HostAdmin gameState={gameState} />}
    </div>
  );
}

// ─── Election Results Sub-component ──────────────────────────────

function ElectionResults({ gameState }: { gameState: PlayerView }) {
  if (!gameState.votes) return null;

  const jaCount = gameState.votes.filter(v => v.vote === 'ja').length;
  const neinCount = gameState.votes.filter(v => v.vote === 'nein').length;
  const passed = jaCount > neinCount;

  return (
    <div className="text-center">
      <h3 className={`text-2xl font-bold mb-4 ${passed ? 'text-green-400' : 'text-red-400'}`}>
        {passed ? 'Election Passed!' : 'Election Failed!'}
      </h3>
      <p className="text-lg mb-4">
        <span className="text-green-400 font-bold">{jaCount} Ja</span>
        {' / '}
        <span className="text-red-400 font-bold">{neinCount} Nein</span>
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-md mx-auto">
        {gameState.votes.map(v => {
          const player = gameState.players.find(p => p.id === v.playerId);
          return (
            <div
              key={v.playerId}
              className={`px-3 py-2 rounded-lg text-sm ${
                v.vote === 'ja'
                  ? 'bg-green-900/30 border border-green-700/30 text-green-300'
                  : 'bg-red-900/30 border border-red-700/30 text-red-300'
              }`}
            >
              <span className="font-medium">{player?.name}</span>
              <span className="ml-2 font-bold">{v.vote === 'ja' ? 'Ja!' : 'Nein'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Policy Enacted Sub-component ────────────────────────────────

function PolicyEnacted({ gameState }: { gameState: PlayerView }) {
  const isLiberal = gameState.lastEnactedPolicy === 'liberal';

  return (
    <div className="text-center py-4">
      <div className={`inline-block w-20 h-28 rounded-xl text-3xl flex items-center justify-center mb-4
        ${isLiberal ? 'policy-liberal' : 'policy-fascist'}
        ${isLiberal ? 'glow-liberal' : 'glow-fascist'}`}
      >
        {isLiberal ? '🕊️' : '☠️'}
      </div>
      <h3 className={`text-2xl font-bold ${isLiberal ? 'text-liberal' : 'text-fascist'}`}>
        {isLiberal ? 'Liberal' : 'Fascist'} Policy Enacted!
      </h3>
    </div>
  );
}
