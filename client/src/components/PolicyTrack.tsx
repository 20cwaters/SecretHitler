import type { ExecutivePower } from '@shared/types';

interface Props {
  type: 'liberal' | 'fascist';
  enacted: number;
  fascistTrackPowers?: ExecutivePower[];
}

const powerIcons: Record<string, string> = {
  investigate: '🔍',
  special_election: '🗳️',
  policy_peek: '👁️',
  execution: '💀',
};

const powerLabels: Record<string, string> = {
  investigate: 'Investigate',
  special_election: 'Election',
  policy_peek: 'Peek',
  execution: 'Execute',
};

export default function PolicyTrack({ type, enacted, fascistTrackPowers }: Props) {
  const slots = type === 'liberal' ? 5 : 6;
  const isLiberal = type === 'liberal';

  return (
    <div className={`rounded-xl p-4 ${
      isLiberal
        ? 'bg-gradient-to-r from-blue-950 to-blue-900 border border-liberal/30'
        : 'bg-gradient-to-r from-red-950 to-red-900 border border-fascist/30'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-bold text-sm uppercase tracking-wider ${
          isLiberal ? 'text-liberal-light' : 'text-fascist-light'
        }`}>
          {isLiberal ? 'Liberal' : 'Fascist'} Policies
        </h3>
        <span className={`text-xs font-mono ${isLiberal ? 'text-liberal' : 'text-fascist'}`}>
          {enacted}/{slots}
        </span>
      </div>

      <div className="flex gap-2 justify-center">
        {Array.from({ length: slots }, (_, i) => {
          const filled = i < enacted;
          const power = !isLiberal && fascistTrackPowers ? fascistTrackPowers[i] : null;
          const isVetoSlot = !isLiberal && i === 4; // 5th fascist policy unlocks veto

          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`w-11 h-14 sm:w-12 sm:h-16 rounded-lg flex items-center justify-center text-lg font-bold
                  transition-all duration-300
                  ${filled
                    ? isLiberal
                      ? 'policy-liberal shadow-lg shadow-blue-500/20'
                      : 'policy-fascist shadow-lg shadow-red-500/20'
                    : 'border-2 border-dashed opacity-50'
                  }
                  ${filled
                    ? ''
                    : isLiberal
                      ? 'border-liberal/40'
                      : 'border-fascist/40'
                  }`}
              >
                {filled
                  ? (isLiberal ? '🕊️' : '☠️')
                  : (power ? powerIcons[power] || '' : '')}
              </div>
              {power && !filled && (
                <span className="text-[10px] text-gray-500">
                  {powerLabels[power]}
                </span>
              )}
              {isVetoSlot && !filled && (
                <span className="text-[10px] text-yellow-500">Veto</span>
              )}
              {isLiberal && i === 4 && !filled && (
                <span className="text-[10px] text-blue-400">Win!</span>
              )}
              {!isLiberal && i === 5 && !filled && (
                <span className="text-[10px] text-red-400">Win!</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
