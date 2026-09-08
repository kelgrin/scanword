-- Таблица комнат
CREATE TABLE game_rooms (
  id UUID PRIMARY KEY,
  room_code VARCHAR(6) UNIQUE NOT NULL,
  crossword_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  player_count INTEGER DEFAULT 1
);

-- Таблица игроков
CREATE TABLE players (
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  player_name TEXT NOT NULL,
  color TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (room_id, player_id)
);

-- Таблица состояния игры (буквы)
CREATE TABLE game_state (
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  cell_id TEXT NOT NULL,
  letter TEXT NOT NULL,
  player_color TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (room_id, player_id, cell_id)
);

-- Таблица чата
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  player_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_game_rooms_code ON game_rooms(room_code);
CREATE INDEX idx_game_rooms_active ON game_rooms(is_active);
CREATE INDEX idx_players_room ON players(room_id);
CREATE INDEX idx_game_state_room ON game_state(room_id);
CREATE INDEX idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

-- Включаем Row Level Security
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Политики для game_rooms
CREATE POLICY "Enable read access for all users" ON game_rooms
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON game_rooms
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON game_rooms
  FOR UPDATE USING (true);

-- Политики для players
CREATE POLICY "Enable read access for all users" ON players
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON players
  FOR UPDATE USING (true);

-- Политики для game_state
CREATE POLICY "Enable read access for all users" ON game_state
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON game_state
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON game_state
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON game_state
  FOR DELETE USING (true);

-- Политики для chat_messages
CREATE POLICY "Enable read access for all users" ON chat_messages
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON chat_messages
  FOR INSERT WITH CHECK (true);

-- Включаем Realtime для всех таблиц
ALTER PUBLICATION supabase_realtime ADD TABLE game_state;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
