import { supabase } from './supabaseApi';
import { CrosswordData } from '../types/crossword';

export interface GameRoom {
  id: string;
  crossword_data: CrosswordData;
  created_at: string;
  is_active: boolean;
  player_count: number;
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

// Присоединиться к комнате по коду
export async function joinRoom(
  roomCode: string,
  playerName: string
): Promise<{ roomId: string; playerId: string; crosswordData: CrosswordData }> {
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
  }]);

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

// Подписаться на изменения состояния игры
export function subscribeToGameState(
  roomId: string,
  callback: (payload: { eventType: string; new: GameState; old?: GameState }) => void
) {
  return supabase
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
        callback({
          eventType: payload.eventType,
          new: payload.new as GameState,
          old: payload.old as GameState | undefined,
        });
      }
    )
    .subscribe();
}

// Подписаться на изменения игроков
export function subscribeToPlayers(
  roomId: string,
  callback: (payload: { eventType: string; new: Player }) => void
) {
  return supabase
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
        callback({
          eventType: payload.eventType,
          new: payload.new as Player,
        });
      }
    )
    .subscribe();
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

// Подписаться на новые сообщения чата
export function subscribeToChat(
  roomId: string,
  callback: (payload: { new: ChatMessage }) => void
) {
  return supabase
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
        callback({ new: payload.new as ChatMessage });
      }
    )
    .subscribe();
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
