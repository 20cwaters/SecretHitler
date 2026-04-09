import { useState, useRef, useEffect } from 'react';
import { socket } from '../socket';
import type { PlayerView } from '@shared/types';

interface Props {
  gameState: PlayerView;
}

export default function Chat({ gameState }: Props) {
  const [text, setText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAlive = gameState.players.find(p => p.id === gameState.myId)?.isAlive ?? true;
  const isMuted = !isAlive && gameState.phase !== 'lobby' && gameState.phase !== 'game_over';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.chatMessages.length]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isMuted) return;
    socket.emit('send_chat', { text: text.trim() });
    setText('');
    inputRef.current?.focus();
  };

  return (
    <div className="card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-sm font-semibold text-gray-300"
      >
        <span>Chat</span>
        <span className="text-xs text-gray-500">
          {isOpen ? '▲ Hide' : '▼ Show'} ({gameState.chatMessages.length})
        </span>
      </button>

      {isOpen && (
        <div className="mt-3 fade-in">
          <div className="h-48 overflow-y-auto bg-board-bg rounded-lg p-3 space-y-1 text-sm">
            {gameState.chatMessages.length === 0 && (
              <p className="text-gray-500 text-center py-4">No messages yet</p>
            )}
            {gameState.chatMessages.map(msg => (
              <div key={msg.id} className={msg.isSystem ? 'text-yellow-400/70 italic' : ''}>
                {msg.isSystem ? (
                  <span>{msg.text}</span>
                ) : (
                  <>
                    <span className="font-semibold text-liberal-light">{msg.playerName}: </span>
                    <span className="text-gray-300">{msg.text}</span>
                  </>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="mt-2 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={isMuted ? 'Dead players are muted' : 'Type a message...'}
              disabled={isMuted}
              maxLength={500}
              className="flex-1 px-3 py-2 bg-board-bg border border-gray-600 rounded-lg text-white
                text-sm focus:outline-none focus:border-liberal placeholder:text-gray-500
                disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!text.trim() || isMuted}
              className="px-4 py-2 bg-board-surface text-white rounded-lg text-sm
                hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
