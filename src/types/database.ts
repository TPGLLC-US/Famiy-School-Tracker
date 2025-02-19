export interface Database {
  public: {
    Tables: {
      students: {
        Row: {
          id: string;
          name: string;
          email: string;
          grade_level: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          grade_level: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          grade_level?: number;
          created_at?: string;
        };
      };
      parent_students: {
        Row: {
          id: string;
          parent_id: string;
          student_email: string;
          status: 'pending' | 'approved' | 'rejected';
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          student_email: string;
          status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
        };
        Update: {
          id?: string;
          parent_id?: string;
          student_email?: string;
          status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
        };
      };
      rewards: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          points_cost: number;
          created_by: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          points_cost: number;
          created_by: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          points_cost?: number;
          created_by?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      student_rewards: {
        Row: {
          id: string;
          student_email: string;
          reward_id: string;
          status: 'pending' | 'approved' | 'rejected' | 'redeemed';
          approved_by: string | null;
          redeemed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_email: string;
          reward_id: string;
          status?: 'pending' | 'approved' | 'rejected' | 'redeemed';
          approved_by?: string | null;
          redeemed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_email?: string;
          reward_id?: string;
          status?: 'pending' | 'approved' | 'rejected' | 'redeemed';
          approved_by?: string | null;
          redeemed_at?: string | null;
          created_at?: string;
        };
      };
      achievement_points: {
        Row: {
          id: string;
          student_email: string;
          points: number;
          reason: string;
          awarded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_email: string;
          points: number;
          reason: string;
          awarded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_email?: string;
          points?: number;
          reason?: string;
          awarded_by?: string;
          created_at?: string;
        };
      };
    };
  };
}