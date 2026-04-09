import { useState } from 'react';

interface Props {
  onCreateLobby: (name: string) => void;
  onJoinLobby: (code: string, name: string) => void;
  initialCode: string;
}

export default function Landing({ onCreateLobby, onJoinLobby, initialCode }: Props) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>(initialCode ? 'join' : 'menu');
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialCode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (mode === 'create') {
      onCreateLobby(name.trim());
    } else if (mode === 'join') {
      if (!code.trim()) return;
      onJoinLobby(code.trim().toUpperCase(), name.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center fade-in">
        <h1 className="text-5xl font-black mb-2 tracking-tight">
          <span className="text-fascist">SECRET</span>{' '}
          <span className="text-gray-200">HITLER</span>
        </h1>
        <p className="text-gray-400 mb-8 text-sm">A social deduction game for 5–10 players</p>

        {mode === 'menu' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="btn-primary w-full text-lg py-4"
            >
              Create Lobby
            </button>
            <button
              onClick={() => setMode('join')}
              className="btn-primary w-full text-lg py-4"
            >
              Join Lobby
            </button>
          </div>
        )}

        {(mode === 'create' || mode === 'join') && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'join' && (
              <div>
                <label className="block text-sm text-gray-400 mb-1 text-left">Room Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="ABCDE"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-board-bg border border-gray-600 rounded-lg
                    text-white text-center text-2xl tracking-[0.3em] font-mono
                    focus:outline-none focus:border-liberal placeholder:text-gray-600
                    placeholder:tracking-[0.3em]"
                  autoFocus
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1 text-left">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your display name"
                maxLength={20}
                className="w-full px-4 py-3 bg-board-bg border border-gray-600 rounded-lg
                  text-white focus:outline-none focus:border-liberal placeholder:text-gray-500"
                autoFocus={mode === 'create'}
              />
            </div>
            <button
              type="submit"
              disabled={!name.trim() || (mode === 'join' && !code.trim())}
              className="btn-primary w-full text-lg py-4"
            >
              {mode === 'create' ? 'Create & Join' : 'Join Game'}
            </button>
            <button
              type="button"
              onClick={() => setMode('menu')}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              &larr; Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
