interface Props {
  count: number;
}

export default function ElectionTracker({ count }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 uppercase tracking-wider">Election Tracker</span>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              transition-all duration-300
              ${i < count
                ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/30'
                : 'border-2 border-gray-600 text-gray-600'
              }`}
          >
            {i + 1}
          </div>
        ))}
      </div>
      {count >= 2 && (
        <span className="text-yellow-400 text-xs animate-pulse">Chaos at 3!</span>
      )}
    </div>
  );
}
