import { socket } from '../socket';
import type { PlayerView } from '@shared/types';

interface Props {
  gameState: PlayerView;
}

export default function NightPhase({ gameState }: Props) {
  const { nightInfo, nightReady } = gameState;

  if (!nightInfo) return null;

  const roleColors = {
    liberal: 'text-liberal',
    fascist: 'text-fascist',
    hitler: 'text-hitler',
  };

  const roleLabels = {
    liberal: 'Liberal',
    fascist: 'Fascist',
    hitler: 'Hitler',
  };

  const teamBorder = nightInfo.yourTeam === 'liberal' ? 'border-liberal glow-liberal' : 'border-fascist glow-fascist';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className={`card max-w-md w-full text-center fade-in border-2 ${teamBorder}`}>
        <h2 className="text-2xl font-bold mb-6">Your Secret Role</h2>

        {/* Role card */}
        <div className={`rounded-xl p-8 mb-6 ${
          nightInfo.yourTeam === 'liberal'
            ? 'bg-gradient-to-br from-blue-900 to-blue-800'
            : 'bg-gradient-to-br from-red-900 to-red-800'
        }`}>
          <p className="text-gray-300 text-sm mb-2">Party Membership</p>
          <p className={`text-3xl font-black mb-4 ${roleColors[nightInfo.yourTeam]}`}>
            {nightInfo.yourTeam === 'liberal' ? 'LIBERAL' : 'FASCIST'}
          </p>

          <div className="border-t border-white/20 pt-4">
            <p className="text-gray-300 text-sm mb-2">Secret Role</p>
            <p className={`text-4xl font-black ${roleColors[nightInfo.yourRole]}`}>
              {roleLabels[nightInfo.yourRole].toUpperCase()}
            </p>
          </div>
        </div>

        {/* Known information */}
        {nightInfo.knownFascists.length > 0 && (
          <div className="bg-board-bg rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-400 mb-2">
              {nightInfo.yourRole === 'hitler'
                ? 'Your fellow Fascist:'
                : 'The Fascist team:'}
            </p>
            <div className="space-y-2">
              {nightInfo.knownFascists.map(f => (
                <div key={f.id} className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${roleColors[f.role]}`}>
                    {roleLabels[f.role]}
                  </span>
                  <span className="text-white">{f.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {nightInfo.yourRole === 'liberal' && (
          <p className="text-gray-400 text-sm mb-6">
            You don't know anyone's identity. Trust no one!
          </p>
        )}

        {nightInfo.yourRole === 'hitler' && nightInfo.knownFascists.length === 0 && (
          <p className="text-gray-400 text-sm mb-6">
            You are Hitler, but you don't know who the Fascists are. They know you.
          </p>
        )}

        <button
          onClick={() => socket.emit('night_ready')}
          disabled={nightReady}
          className={`btn-primary w-full text-lg py-4 ${nightReady ? 'opacity-50' : ''}`}
        >
          {nightReady ? 'Waiting for others...' : 'I\'m Ready'}
        </button>
      </div>
    </div>
  );
}
