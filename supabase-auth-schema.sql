-- Таблица прогресса кроссвордов
CREATE TABLE user_crossword_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  crossword_id TEXT NOT NULL,
  crossword_data JSONB NOT NULL,
  cells_state JSONB NOT NULL,
  words_solved INTEGER[] DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent INTEGER DEFAULT 0, -- в секундах
  is_completed BOOLEAN DEFAULT false,
  UNIQUE(user_id, crossword_id)
);

-- Таблица настроек пользователя
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  words_per_crossword INTEGER DEFAULT 25,
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица статистики пользователя
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_crosswords_completed INTEGER DEFAULT 0,
  total_words_solved INTEGER DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0, -- в секундах
  current_streak INTEGER DEFAULT 0, -- дней подряд
  longest_streak INTEGER DEFAULT 0,
  last_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_user_progress_user_id ON user_crossword_progress(user_id);
CREATE INDEX idx_user_progress_completed ON user_crossword_progress(user_id, is_completed);
CREATE INDEX idx_user_progress_last_activity ON user_crossword_progress(user_id, last_activity DESC);

-- Включаем Row Level Security
ALTER TABLE user_crossword_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Политики для user_crossword_progress
CREATE POLICY "Users can view their own progress"
  ON user_crossword_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON user_crossword_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON user_crossword_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress"
  ON user_crossword_progress FOR DELETE
  USING (auth.uid() = user_id);

-- Политики для user_settings
CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Политики для user_stats
CREATE POLICY "Users can view their own stats"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Функция для автоматического создания записей при регистрации
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Создаем настройки по умолчанию
  INSERT INTO user_settings (user_id) VALUES (NEW.id);
  
  -- Создаем статистику
  INSERT INTO user_stats (user_id) VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоматического создания записей
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Функция для обновления статистики при завершении кроссворда
CREATE OR REPLACE FUNCTION update_user_stats_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = true AND OLD.is_completed = false THEN
    UPDATE user_stats
    SET 
      total_crosswords_completed = total_crosswords_completed + 1,
      total_words_solved = total_words_solved + array_length(NEW.words_solved, 1),
      total_time_spent = total_time_spent + NEW.time_spent,
      last_completed_at = NEW.completed_at,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для обновления статистики
CREATE TRIGGER on_crossword_completed
  AFTER UPDATE ON user_crossword_progress
  FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_completion();
