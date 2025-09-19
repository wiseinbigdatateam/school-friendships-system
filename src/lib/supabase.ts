import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// 환경 변수에서 Supabase URL과 키를 가져옵니다
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://remyljfgamdnpshhjtsf.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbXlsamZnYW1kbnBzaGhqdHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5Mzg4ODgsImV4cCI6MjA2OTUxNDg4OH0.g-XDLSMqbbW4vpt9lgvMdAs7L4nQSxD0RClPBOQNhMU';

// 싱글톤 패턴으로 Supabase 클라이언트 생성
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return supabaseInstance;
})();

// 타입 유틸리티
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
