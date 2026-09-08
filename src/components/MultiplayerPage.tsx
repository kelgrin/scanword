import React, { useState } from 'react';
import { ArrowLeft, Users, UserPlus, Copy, Check } from 'lucide-react';
import { createRoom, joinRoom } from '../services/multiplayerApi';
import { useCrosswordStore } from '../store/crosswordStore';
import { CrosswordData } from '../types/crossword';

interface MultiplayerPageProps {
  onBack: () => void;
  onRoomCreated: (roomId: string, playerId: string, code: string, crosswordData: CrosswordData) => void;
  onRoomJoined: (roomId: string, playerId: string, crosswordData: CrosswordData) => void;
}

const MultiplayerPage: React.FC<MultiplayerPageProps> = ({ onBack, onRoomCreated, onRoomJoined }) => {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [createdPlayerId, setCreatedPlayerId] = useState('');
  const [createdCrosswordData, setCreatedCrosswordData] = useState<CrosswordData | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Введите ваше имя');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Генерируем новый сканворд для мультиплеера
      const { crosswordApi } = await import('../services/crosswordApi');
      const crosswordData = await crosswordApi.generateNew();
      
      const { roomId, playerId, code } = await createRoom(crosswordData, playerName.trim());
      setCreatedRoomCode(code);
      setCreatedRoomId(roomId);
      setCreatedPlayerId(playerId);
      setCreatedCrosswordData(crosswordData);
      
      // Загружаем кроссворд в store
      useCrosswordStore.getState().loadCrossword(crosswordData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания комнаты');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('Введите ваше имя');
      return;
    }
    if (!roomCode.trim()) {
      setError('Введите код комнаты');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { roomId, playerId, crosswordData } = await joinRoom(roomCode.trim(), playerName.trim());
      
      // Загружаем кроссворд в store
      useCrosswordStore.getState().loadCrossword(crosswordData);
      
      onRoomJoined(roomId, playerId, crosswordData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка присоединения к комнате');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(createdRoomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Назад
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 text-center">
              Мультиплеер
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
              Играйте в сканворд с друзьями
            </p>

            <div className="space-y-4">
              <button
                onClick={() => setMode('create')}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-3"
              >
                <Users className="w-6 h-6" />
                Создать комнату
              </button>

              <button
                onClick={() => setMode('join')}
                className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-3"
              >
                <UserPlus className="w-6 h-6" />
                Присоединиться
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    if (createdRoomCode) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Комната создана!
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Поделитесь кодом с другом
              </p>

              <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Код комнаты:
                </div>
                <div className="text-3xl font-mono font-bold text-gray-800 dark:text-white tracking-wider">
                  {createdRoomCode}
                </div>
              </div>

              <button
                onClick={handleCopyCode}
                className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 mb-4"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    Скопировано!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Копировать код
                  </>
                )}
              </button>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Отправьте код другу и дождитесь его присоединения
              </p>

              <button
                onClick={() => {
                  if (createdRoomId && createdPlayerId && createdRoomCode && createdCrosswordData) {
                    onRoomCreated(createdRoomId, createdPlayerId, createdRoomCode, createdCrosswordData);
                  }
                }}
                className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Продолжить
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <button
            onClick={() => setMode('select')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Назад
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
              Создать комнату
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ваше имя
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Введите имя"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}

              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Создание...' : 'Создать комнату'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <button
            onClick={() => setMode('select')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Назад
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
              Присоединиться
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ваше имя
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Введите имя"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Код комнаты
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Например: ABC123"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-center text-xl tracking-wider"
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}

              <button
                onClick={handleJoinRoom}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Присоединение...' : 'Присоединиться'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MultiplayerPage;
