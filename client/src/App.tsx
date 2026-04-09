import { useState, useEffect, useCallback } from 'react';
import { socket } from './socket';
import type { PlayerView, ChatMessage } from '@shared/types';
import { Toaster, toast } from 'react-hot-toast';
import Landing from './components/Landing';
import Lobby from './components/Lobby';
import NightPhase from './components/NightPhase';
import GameBoard from './components/GameBoard';
import GameOver from './components/GameOver';

export default function App() {
  const [gameState, setGameState] = useState<PlayerView | null>(null);
  const [connected, setConnected] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
      // Attempt reconnection if we have stored info
      const storedName = sessionStorage.getItem('sh_name');
      const storedCode = sessionStorage.getItem('sh_lobby');
      if (storedName && storedCode) {
        socket.emit('reconnect_lobby', {
          lobbyCode: storedCode,
          playerName: storedName,
        });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('game_state', (view: PlayerView) => {
      setGameState(view);
    });

    socket.on('lobby_created', ({ lobbyCode }: { lobbyCode: string }) => {
      setLobbyCode(lobbyCode);
      sessionStorage.setItem('sh_lobby', lobbyCode);
    });

    socket.on('error', ({ message }: { message: string }) => {
      toast.error(message);
      // If kicked, reset state
      if (message.includes('kicked')) {
        setGameState(null);
        setLobbyCode('');
        sessionStorage.removeItem('sh_lobby');
        sessionStorage.removeItem('sh_name');
      }
    });

    socket.on('chat_message', (_msg: ChatMessage) => {
      // Chat messages are handled via game_state updates
      // This event is for real-time notification if needed
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game_state');
      socket.off('lobby_created');
      socket.off('error');
      socket.off('chat_message');
    };
  }, []);

  const handleCreateLobby = useCallback((name: string) => {
    setPlayerName(name);
    sessionStorage.setItem('sh_name', name);
    socket.emit('create_lobby', { playerName: name });
  }, []);

  const handleJoinLobby = useCallback((code: string, name: string) => {
    setPlayerName(name);
    setLobbyCode(code);
    sessionStorage.setItem('sh_name', name);
    sessionStorage.setItem('sh_lobby', code);
    socket.emit('join_lobby', { lobbyCode: code, playerName: name });
  }, []);

  const handleLeave = useCallback(() => {
    setGameState(null);
    setLobbyCode('');
    sessionStorage.removeItem('sh_lobby');
    sessionStorage.removeItem('sh_name');
    socket.disconnect();
    socket.connect();
  }, []);

  // Determine which screen to show
  const renderScreen = () => {
    if (!gameState) {
      return (
        <Landing
          onCreateLobby={handleCreateLobby}
          onJoinLobby={handleJoinLobby}
          initialCode={new URLSearchParams(window.location.search).get('code') || ''}
        />
      );
    }

    switch (gameState.phase) {
      case 'lobby':
        return <Lobby gameState={gameState} onLeave={handleLeave} />;
      case 'night':
        return <NightPhase gameState={gameState} />;
      case 'game_over':
        return <GameOver gameState={gameState} />;
      default:
        return <GameBoard gameState={gameState} />;
    }
  };

  return (
    <div className="min-h-screen bg-board-bg">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#16213e',
            color: '#e0e0e0',
            border: '1px solid #333',
          },
          error: {
            style: {
              background: '#3d1010',
              border: '1px solid #E53935',
            },
          },
        }}
      />
      {!connected && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-800 text-center py-2 z-50 text-sm">
          Reconnecting...
        </div>
      )}
      {renderScreen()}
    </div>
  );
}
