import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon } from 'lucide-react';
import { getSettings, updateSettings } from '../services/userService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSettingsChange }) => {
  const [wordsPerCrossword, setWordsPerCrossword] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const settings = await getSettings();
      if (settings) {
        setWordsPerCrossword(settings.words_per_crossword);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      await updateSettings({ words_per_crossword: wordsPerCrossword });
      onSettingsChange();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения настроек');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-6 h-6 text-gray-800 dark:text-white" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Настройки
          </h2>
        </div>

        <div className="space-y-6">
          <div>
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
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span>10 слов</span>
              <span>50 слов</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
