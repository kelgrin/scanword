import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Trophy, Clock, TrendingUp, Play } from 'lucide-react';
import { getSettings, updateSettings, getStats, getIncompleteProgress } from '../services/userService';
import { useCrosswordStore } from '../store/crosswordStore';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange: (wordsCount: number) => void;
  onLoadProgress: (crosswordId: string) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onSettingsChange, onLoadProgress }) => {
  const [wordsPerCrossword, setWordsPerCrossword] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [incompleteProgress, setIncompleteProgress] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [settings, statsData, incomplete] = await Promise.all([
        getSettings(),
        getStats(),
        getIncompleteProgress()
      ]);
      
      if (settings) {
        setWordsPerCrossword(settings.words_per_crossword);
      }
      if (statsData) {
        setStats(statsData);
      }
      setIncompleteProgress(incomplete || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      await updateSettings({ words_per_crossword: wordsPerCrossword });
      onSettingsChange(wordsPerCrossword);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения настроек');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}ч ${minutes}м`;
    }
    return `${minutes}м`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <SettingsIcon className="w-6 h-6 text-gray-800 dark:text-white" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Личный кабинет
            </h2>
          </div>

          {/* Статистика */}
          {stats && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Статистика
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.total_crosswords_completed || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Решено кроссвордов
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {stats.total_words_solved || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Разгадано слов
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {formatTime(stats.total_time_spent || 0)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Общее время
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {stats.current_streak || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Дней подряд
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Недорешенные сканворды */}
          {incompleteProgress.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <Play className="w-5 h-5 text-green-500" />
                Недорешенные сканворды
              </h3>
              <div className="space-y-2">
                {incompleteProgress.map((progress) => (
                  <div
                    key={progress.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-gray-800 dark:text-white">
                        Сканворд #{progress.crossword_id.slice(-6)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {progress.words_solved?.length || 0} слов решено •{' '}
                        {formatTime(progress.time_spent || 0)} затрачено
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onLoadProgress(progress.crossword_id);
                        onClose();
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all"
                    >
                      Продолжить
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Настройки */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              Настройки
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Количество слов в сканворде: <span className="text-blue-600 dark:text-blue-400 font-bold">{wordsPerCrossword}</span>
              </label>
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={wordsPerCrossword}
                onChange={(e) => setWordsPerCrossword(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                <span>10 слов</span>
                <span>50 слов</span>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
