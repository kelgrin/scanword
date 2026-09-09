import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mcmnaieudpkphtrwovbe.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jbW5haWV1ZHBrcGh0cndvdmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NzYxNzAsImV4cCI6MjEwNDQ1MjE3MH0.xONZiek2ZQZ7DwJDz3EJtqiAS3a-ds8x6eQrcXB5w7Q';

if (!supabaseKey) {
  console.error('Supabase anon key is not set. Please add VITE_SUPABASE_ANON_KEY to your .env file');
  throw new Error('Supabase anon key is required');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    timeout: 30000,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface Question {
  id: number;
  question: string;
  answer: string;
  length?: number;
  difficulty?: number;
}

export async function getQuestions(count: number = 10): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .limit(count * 3);
  
  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
  
  if (!data) return [];
  
  const shuffled = data.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

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
