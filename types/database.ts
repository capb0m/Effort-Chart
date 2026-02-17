// Supabase Database Types

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      records: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          start_time: string;
          end_time: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          start_time: string;
          end_time: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          start_time?: string;
          end_time?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          type: 'daily' | 'period';
          target_hours: number;
          deadline: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          type: 'daily' | 'period';
          target_hours: number;
          deadline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string | null;
          type?: 'daily' | 'period';
          target_hours?: number;
          deadline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      timer_sessions: {
        Row: {
          id: string;
          user_id: string;
          start_time: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          start_time: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          start_time?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type Category = Database['public']['Tables']['categories']['Row'];
export type Record = Database['public']['Tables']['records']['Row'];
export type Goal = Database['public']['Tables']['goals']['Row'];
export type TimerSession = Database['public']['Tables']['timer_sessions']['Row'];
