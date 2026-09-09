import { supabase } from './supabaseApi';
import { CrosswordData, Cell } from '../types/crossword';

export interface UserProgress {
  id: string;
  user_id: string;
  crossword_id: string;
  crossword_data: CrosswordData;
  cells_state: Record<string, string>;
  words_solved: number[];
  started_at: string;
  last_activity: string;
  completed_at: string | null;
  time_spent: number;
  is_completed: boolean;
}

export interface UserSettings {
  user_id: string;
  words_per_crossword: number;
  theme: 'light' | 'dark';
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  user_id: string;
  total_crosswords_completed: number;
  total_words_solved: number;
  total_time_spent: number;
  current_streak: number;
  longest_streak: number;
  last_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============ AUTH ============

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
}

// ============ PROGRESS ============

export async function saveProgress(
  crosswordId: string,
  crosswordData: CrosswordData,
  cells: Cell[],
  wordsSolved: number[],
  timeSpent: number,
  isCompleted: boolean
) {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const cellsState = cells.reduce((acc, cell) => {
    if (cell.userInput) {
      acc[cell.id] = cell.userInput;
    }
    return acc;
  }, {} as Record<string, string>);

  const { error } = await supabase
    .from('user_crossword_progress')
    .upsert({
      user_id: user.id,
      crossword_id: crosswordId,
      crossword_data: crosswordData,
      cells_state: cellsState,
      words_solved: wordsSolved,
      time_spent: timeSpent,
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
      last_activity: new Date().toISOString(),
    }, {
      onConflict: 'user_id,crossword_id'
    });

  if (error) throw error;
}

export async function loadProgress(crosswordId: string): Promise<UserProgress | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_crossword_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('crossword_id', crosswordId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function getIncompleteProgress(): Promise<UserProgress[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_crossword_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_completed', false)
    .order('last_activity', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getCompletedProgress(): Promise<UserProgress[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_crossword_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_completed', true)
    .order('completed_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function deleteProgress(crosswordId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('user_crossword_progress')
    .delete()
    .eq('user_id', user.id)
    .eq('crossword_id', crosswordId);

  if (error) throw error;
}

// ============ SETTINGS ============

export async function getSettings(): Promise<UserSettings | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return null;
  return data;
}

export async function updateSettings(settings: Partial<UserSettings>) {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('user_settings')
    .update({
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) throw error;
}

// ============ STATS ============

export async function getStats(): Promise<UserStats | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return null;
  return data;
}

export async function updateStatsOnCompletion(wordsSolved: number, timeSpent: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { data: currentStats, error: fetchError } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (fetchError || !currentStats) return;

  // Проверяем streak
  const now = new Date();
  const lastCompleted = currentStats.last_completed_at ? new Date(currentStats.last_completed_at) : null;
  
  let newStreak = currentStats.current_streak;
  if (lastCompleted) {
    const daysDiff = Math.floor((now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff === 1) {
      newStreak += 1;
    } else if (daysDiff > 1) {
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }

  const { error } = await supabase
    .from('user_stats')
    .update({
      total_crosswords_completed: currentStats.total_crosswords_completed + 1,
      total_words_solved: currentStats.total_words_solved + wordsSolved,
      total_time_spent: currentStats.total_time_spent + timeSpent,
      current_streak: newStreak,
      longest_streak: Math.max(currentStats.longest_streak, newStreak),
      last_completed_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('user_id', user.id);

  if (error) throw error;
}
