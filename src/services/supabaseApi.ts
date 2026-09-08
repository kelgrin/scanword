import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mcmnaieudpkphtrwovbe.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.warn('Supabase anon key is not set. Please add VITE_SUPABASE_ANON_KEY to your .env file');
}

export const supabase = createClient(supabaseUrl, supabaseKey || '');

export interface Question {
  id: number;
  question: string;
  answer: string;
  length?: number;
  difficulty?: number;
}

// Получить случайные вопросы из базы
export async function getQuestions(count: number = 10): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .limit(count * 3); // Берем больше чтобы было из чего выбирать
  
  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
  
  if (!data) return [];
  
  // Перемешиваем и берем нужное количество
  const shuffled = data.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Получить все вопросы
export async function getAllQuestions(): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*');
  
  if (error) {
    console.error('Error fetching all questions:', error);
    return [];
  }
  
  return data || [];
}

// Получить вопросы определенной длины
export async function getQuestionsByLength(length: number): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('length', length);
  
  if (error) {
    console.error('Error fetching questions by length:', error);
    return [];
  }
  
  return data || [];
}

// Получить вопросы по сложности
export async function getQuestionsByDifficulty(difficulty: number): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('difficulty', difficulty);
  
  if (error) {
    console.error('Error fetching questions by difficulty:', error);
    return [];
  }
  
  return data || [];
}
