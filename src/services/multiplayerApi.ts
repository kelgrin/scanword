import { supabase } from './supabaseApi';
import { CrosswordData } from '../types/crossword';

export interface GameRoom {
  id: string;
  crossword_data: CrosswordData;
  created_at: string;
  is_active: boolean;
  player_count: number;
  creator_id?: string;
}

export interface Player {
  room_id: string;
  player_id: string;
  player_name: string;
  color: string;
  joined_at: string;
}

export interface GameState {
  room_id: string;
  player_id: string;
  cell_id: string;
  letter: string;
  player_color?: string;
  updated_at: string;
}

// Alias for backward compatibility
export type GameLetter = GameState;

export interface ChatMessage {
  id: string;
  room_id: string;
  player_id: string;
  player_name: string;
  message: string;
  created_at: string;
}

const PLAYER_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'];

// Генерация короткого кода комнаты
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Создать комнату
export async function createRoom(
  crosswordData: CrosswordData,
  playerName: string
): Promise<{ roomId: string; playerId: string; code: string }> {
  const roomId = crypto.randomUUID();
  const playerId = crypto.randomUUID();
  const code = generateRoomCode();
  
  const { error } = await supabase.from('game_rooms').insert([{
    id: roomId,
    room_code: code,
    crossword_data: crosswordData,
    is_active: true,
    player_count: 1,
    creator_id: playerId,
  }]);
  
  if (error) throw new Error(`Failed to create room: ${error.message}`);
  
  // Добавляем первого игрока
  const { error: playerError } = await supabase.from('players').insert([{
    room_id: roomId,
    player_id: playerId,
    player_name: playerName,
    color: PLAYER_COLORS[0],
  }]);
  
  if (playerError) throw new Error(`Failed to add player: ${playerError.message}`);
  
  return { roomId, playerId, code };
}

// Обновить кроссворд в комнате (только для создателя)
export async function updateRoomCrossword(
  roomId: string,
  creatorId: string,
  crosswordData: CrosswordData
): Promise<void> {
  // Проверяем, что текущий игрок - создатель
  const { data: room, error: roomError } = await supabase
    .from('game_rooms')
    .select('creator_id')
    .eq('id', roomId)
    .single();
  
  if (roomError || !room) {
    throw new Error('Комната не найдена');
  }
  
  if (room.creator_id !== creatorId) {
    throw new Error('Только создатель комнаты может создавать новый кроссворд');
  }
  
  // Обновляем кроссворд
  const { error } = await supabase
    .from('game_rooms')
    .update({ crossword_data: crosswordData })
    .eq('id', roomId);
  
  if (error) throw new Error(`Failed to update crossword: ${error.message}`);
  
  // Очищаем состояние игры
  const { error: clearError } = await supabase
    .from('game_state')
    .delete()
    .eq('room_id', roomId);
  
  if (clearError) throw new Error(`Failed to clear game state: ${clearError.message}`);
}

// Получить информацию о комнате
export async function getRoomInfo(roomId: string): Promise<GameRoom | null> {
  const { data, error } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  
  if (error || !data) return null;
  return data;
}

// Подписаться на изменения кроссворда в комнате
export function subscribeToRoomCrossword(
  roomId: string,
  callback: (crosswordData: CrosswordData) => void
) {
  let pollingInterval: ReturnType<typeof setInterval> | null = null;
  let lastCrosswordId: string | null = null;
  let isConnected = false;

  // Polling fallback
  const startPolling = () => {
    if (pollingInterval) return;
    console.log('[Multiplayer] Starting polling fallback for room crossword');
    
    pollingInterval = setInterval(async () => {
      try {
        const room = await getRoomInfo(roomId);
        if (room && room.crossword_data.id !== lastCrosswordId) {
          lastCrosswordId = room.crossword_data.id;
          callback(room.crossword_data);
        }
      } catch (error) {
        console.error('[Multiplayer] Crossword polling error:', error);
      }
    }, 2000);
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };

  // Try WebSocket first
  const channel = supabase
    .channel(`room-crossword-${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        isConnected = true;
        stopPolling();
        const newRoom = payload.new as GameRoom;
        if (newRoom.crossword_data) {
          callback(newRoom.crossword_data);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isConnected = true;
        stopPolling();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        isConnected = false;
        startPolling();
      }
    });

  // Start polling after 3 seconds if WebSocket doesn't connect
  setTimeout(() => {
    if (!isConnected) {
      startPolling();
    }
  }, 3000);

  // Initialize last crossword id
  getRoomInfo(roomId).then(room => {
    if (room) {
      lastCrosswordId = room.crossword_data.id;
    }
  });

  return {
    unsubscribe: () => {
      channel.unsubscribe();
      stopPolling();
    },
  };
}
// Присоединиться к комнате по коду
export async function joinRoom(
  roomCode: string,
  playerName: string
): Promise<{ roomId: string; playerId: string; crosswordData: CrosswordData; creatorId: string }> {
  // Ищем комнату по коду
  const { data: room, error: roomError } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('room_code', roomCode.toUpperCase())
    .eq('is_active', true)
    .single();

  if (roomError || !room) {
    throw new Error('Комната не найдена или неактивна');
  }

  // Проверяем количество игроков
  if (room.player_count >= 2) {
    throw new Error('Комната уже заполнена (максимум 2 игрока)');
  }

  const playerId = crypto.randomUUID();

  // Добавляем игрока
  const { error: playerError } = await supabase.from('players').insert([{
    room_id: room.id,
    player_id: playerId,
    player_name: playerName,
    color: PLAYER_COLORS[room.player_count],
  }]);

  if (playerError) throw new Error(`Failed to join room: ${playerError.message}`);

  // Обновляем количество игроков
  await supabase
    .from('game_rooms')
    .update({ player_count: room.player_count + 1 })
    .eq('id', room.id);

  return {
    roomId: room.id,
    playerId,
    crosswordData: room.crossword_data,
    creatorId: room.creator_id || '',
  };
}

// Сохранить букву в БД
export async function saveLetter(
  roomId: string,
  playerId: string,
  cellId: string,
  letter: string,
  playerColor?: string
) {
  const { error } = await supabase.from('game_state').upsert([{
    room_id: roomId,
    player_id: playerId,
    cell_id: cellId,
    letter,
    player_color: playerColor,
    updated_at: new Date().toISOString(),
  }], { onConflict: 'room_id,cell_id' });

  if (error) console.error('Failed to save letter:', error);
}

// Удалить букву из БД
export async function deleteLetter(
  roomId: string,
  playerId: string,
  cellId: string
) {
  const { error } = await supabase
    .from('game_state')
    .delete()
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .eq('cell_id', cellId);

  if (error) console.error('Failed to delete letter:', error);
}

// Получить все буквы в комнате
export async function getRoomLetters(roomId: string): Promise<GameState[]> {
  const { data, error } = await supabase
    .from('game_state')
    .select('*')
    .eq('room_id', roomId);

  if (error) {
    console.error('Failed to get room letters:', error);
    return [];
  }

  return data || [];
}

// Получить игроков в комнате
export async function getRoomPlayers(roomId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId);

  if (error) {
    console.error('Failed to get room players:', error);
    return [];
  }

  return data || [];
}

// Подписаться на изменения состояния игры с fallback на polling
export function subscribeToGameState(
  roomId: string,
  callback: (payload: { eventType: string; new: GameState; old?: GameState }) => void
) {
  let pollingInterval: ReturnType<typeof setInterval> | null = null;
  let lastKnownState: Map<string, string> = new Map();
  let isConnected = false;

  // Polling fallback
  const startPolling = () => {
    if (pollingInterval) return;
    console.log('[Multiplayer] Starting polling fallback for game state');
    
    pollingInterval = setInterval(async () => {
      try {
        const letters = await getRoomLetters(roomId);
        const currentState = new Map(letters.map(l => [l.cell_id, l.letter]));
        
        // Detect changes
        currentState.forEach((letter, cellId) => {
          const prevLetter = lastKnownState.get(cellId);
          if (prevLetter !== letter) {
            const gameState = letters.find(l => l.cell_id === cellId);
            if (gameState) {
              callback({
                eventType: prevLetter ? 'UPDATE' : 'INSERT',
                new: gameState,
              });
            }
          }
        });
        
        // Detect deletions
        lastKnownState.forEach((letter, cellId) => {
          if (!currentState.has(cellId)) {
            callback({
              eventType: 'DELETE',
              new: { room_id: roomId, player_id: '', cell_id: cellId, letter: '' } as GameState,
            });
          }
        });
        
        lastKnownState = currentState;
      } catch (error) {
        console.error('[Multiplayer] Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };

  // Try WebSocket first
  const channel = supabase
    .channel(`game-state-${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_state',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        isConnected = true;
        stopPolling(); // Stop polling if WebSocket works
        callback({
          eventType: payload.eventType,
          new: payload.new as GameState,
          old: payload.old as GameState | undefined,
        });
      }
    )
    .subscribe((status) => {
      console.log('[Multiplayer] WebSocket status:', status);
      if (status === 'SUBSCRIBED') {
        isConnected = true;
        stopPolling();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[Multiplayer] WebSocket connection failed, switching to polling');
        isConnected = false;
        startPolling();
      }
    });

  // Start polling after 3 seconds if WebSocket doesn't connect
  setTimeout(() => {
    if (!isConnected) {
      console.log('[Multiplayer] WebSocket timeout, starting polling fallback');
      startPolling();
    }
  }, 3000);

  // Initialize last known state
  getRoomLetters(roomId).then(letters => {
    lastKnownState = new Map(letters.map(l => [l.cell_id, l.letter]));
  });

  return {
    unsubscribe: () => {
      channel.unsubscribe();
      stopPolling();
    },
  };
}

// Подписаться на изменения игроков с fallback на polling
export function subscribeToPlayers(
  roomId: string,
  callback: (payload: { eventType: string; new: Player }) => void
) {
  let pollingInterval: ReturnType<typeof setInterval> | null = null;
  let lastKnownPlayers: Map<string, string> = new Map();
  let isConnected = false;

  // Polling fallback
  const startPolling = () => {
    if (pollingInterval) return;
    console.log('[Multiplayer] Starting polling fallback for players');
    
    pollingInterval = setInterval(async () => {
      try {
        const players = await getRoomPlayers(roomId);
        const currentPlayers = new Map(players.map(p => [p.player_id, p.player_name]));
        
        // Detect new players
        currentPlayers.forEach((name, id) => {
          if (!lastKnownPlayers.has(id)) {
            const player = players.find(p => p.player_id === id);
            if (player) {
              callback({
                eventType: 'INSERT',
                new: player,
              });
            }
          }
        });
        
        // Detect removed players
        lastKnownPlayers.forEach((name, id) => {
          if (!currentPlayers.has(id)) {
            callback({
              eventType: 'DELETE',
              new: { room_id: roomId, player_id: id, player_name: name, color: '', joined_at: '' } as Player,
            });
          }
        });
        
        lastKnownPlayers = currentPlayers;
      } catch (error) {
        console.error('[Multiplayer] Players polling error:', error);
      }
    }, 3000); // Poll every 3 seconds
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };

  // Try WebSocket first
  const channel = supabase
    .channel(`players-${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        isConnected = true;
        stopPolling();
        callback({
          eventType: payload.eventType,
          new: payload.new as Player,
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isConnected = true;
        stopPolling();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        isConnected = false;
        startPolling();
      }
    });

  // Start polling after 3 seconds if WebSocket doesn't connect
  setTimeout(() => {
    if (!isConnected) {
      startPolling();
    }
  }, 3000);

  // Initialize last known players
  getRoomPlayers(roomId).then(players => {
    lastKnownPlayers = new Map(players.map(p => [p.player_id, p.player_name]));
  });

  return {
    unsubscribe: () => {
      channel.unsubscribe();
      stopPolling();
    },
  };
}

// Отправить сообщение в чат
export async function sendChatMessage(
  roomId: string,
  playerId: string,
  playerName: string,
  message: string
) {
  const { error } = await supabase.from('chat_messages').insert([{
    room_id: roomId,
    player_id: playerId,
    player_name: playerName,
    message,
  }]);

  if (error) console.error('Failed to send message:', error);
}

// Получить историю чата
export async function getChatMessages(roomId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) {
    console.error('Failed to get chat messages:', error);
    return [];
  }

  return data || [];
}

// Подписаться на новые сообщения чата с fallback на polling
export function subscribeToChat(
  roomId: string,
  callback: (payload: { new: ChatMessage }) => void
) {
  let pollingInterval: ReturnType<typeof setInterval> | null = null;
  let lastKnownMessageId: string | null = null;
  let isConnected = false;

  // Polling fallback
  const startPolling = () => {
    if (pollingInterval) return;
    console.log('[Chat] Starting polling fallback');
    
    pollingInterval = setInterval(async () => {
      try {
        const messages = await getChatMessages(roomId);
        if (messages.length > 0) {
          const latestMessage = messages[messages.length - 1];
          if (lastKnownMessageId !== latestMessage.id) {
            // Find new messages
            const lastIdx = messages.findIndex(m => m.id === lastKnownMessageId);
            const newMessages = lastIdx === -1 ? messages : messages.slice(lastIdx + 1);
            
            newMessages.forEach(msg => {
              callback({ new: msg });
            });
            
            lastKnownMessageId = latestMessage.id;
          }
        }
      } catch (error) {
        console.error('[Chat] Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };

  // Try WebSocket first
  const channel = supabase
    .channel(`chat-${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        isConnected = true;
        stopPolling();
        callback({ new: payload.new as ChatMessage });
      }
    )
    .subscribe((status) => {
      console.log('[Chat] WebSocket status:', status);
      if (status === 'SUBSCRIBED') {
        isConnected = true;
        stopPolling();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[Chat] WebSocket connection failed, switching to polling');
        isConnected = false;
        startPolling();
      }
    });

  // Start polling after 3 seconds if WebSocket doesn't connect
  setTimeout(() => {
    if (!isConnected) {
      console.log('[Chat] WebSocket timeout, starting polling fallback');
      startPolling();
    }
  }, 3000);

  // Initialize last known message
  getChatMessages(roomId).then(messages => {
    if (messages.length > 0) {
      lastKnownMessageId = messages[messages.length - 1].id;
    }
  });

  return {
    unsubscribe: () => {
      channel.unsubscribe();
      stopPolling();
    },
  };
}

// Покинуть комнату
export async function leaveRoom(roomId: string, playerId: string) {
  // Удаляем игрока
  const { error: playerError } = await supabase
    .from('players')
    .delete()
    .eq('room_id', roomId)
    .eq('player_id', playerId);

  if (playerError) {
    console.error('Failed to leave room:', playerError);
    return;
  }

  // Получаем оставшееся количество игроков
  const { data: remainingPlayers } = await supabase
    .from('players')
    .select('player_id')
    .eq('room_id', roomId);

  const remainingCount = remainingPlayers?.length || 0;

  if (remainingCount === 0) {
    // Если игроков не осталось, удаляем комнату
    await cleanupRoom(roomId);
  } else {
    // Обновляем количество игроков
    await supabase
      .from('game_rooms')
      .update({ player_count: remainingCount })
      .eq('id', roomId);
  }
}

// Очистить комнату
export async function cleanupRoom(roomId: string) {
  // Удаляем все связанные данные
  await supabase.from('game_state').delete().eq('room_id', roomId);
  await supabase.from('chat_messages').delete().eq('room_id', roomId);
  await supabase.from('players').delete().eq('room_id', roomId);
  await supabase.from('game_rooms').delete().eq('id', roomId);
}

// Обновить last_activity
export async function updateRoomActivity(roomId: string) {
  await supabase
    .from('game_rooms')
    .update({ last_activity: new Date().toISOString() })
    .eq('id', roomId);
}

// Закрыть комнату
export async function closeRoom(roomId: string) {
  await supabase
    .from('game_rooms')
    .update({ is_active: false })
    .eq('id', roomId);
}
