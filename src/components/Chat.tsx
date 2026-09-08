import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import {
  sendChatMessage,
  getChatMessages,
  subscribeToChat,
  ChatMessage,
} from '../services/multiplayerApi';

interface ChatProps {
  roomId: string;
  playerId: string;
  playerName: string;
}

const Chat: React.FC<ChatProps> = ({ roomId, playerId, playerName }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Загружаем историю сообщений
    getChatMessages(roomId).then((msgs) => {
      setMessages(msgs);
      setIsConnected(true);
    });

    // Подписываемся на новые сообщения
    const subscription = subscribeToChat(roomId, (payload) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some(m => m.id === payload.new.id)) return prev;
        return [...prev, payload.new];
      });
      setIsConnected(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId]);

  const handleManualSync = async () => {
    const msgs = await getChatMessages(roomId);
    setMessages(msgs);
  };

  useEffect(() => {
    // Прокрутка к последнему сообщению
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    await sendChatMessage(roomId, playerId, playerName, newMessage.trim());
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        title="Открыть чат"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80 h-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <span className="font-semibold">Чат</span>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} title={isConnected ? 'Подключено' : 'Подключение...'} />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleManualSync}
            className="hover:bg-white/20 p-1 rounded transition-colors"
            title="Синхронизировать"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm mt-8">
            Нет сообщений. Начните общение!
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.player_id === playerId;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 ${
                    isOwn
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {!isOwn && (
                    <div className="text-xs font-semibold mb-1 opacity-70">
                      {msg.player_name}
                    </div>
                  )}
                  <div className="text-sm">{msg.message}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите сообщение..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
