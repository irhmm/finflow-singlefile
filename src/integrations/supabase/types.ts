export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_income: {
        Row: {
          code: string | null
          id: number
          nominal: number
          tanggal: string
        }
        Insert: {
          code?: string | null
          id?: number
          nominal: number
          tanggal: string
        }
        Update: {
          code?: string | null
          id?: number
          nominal?: number
          tanggal?: string
        }
        Relationships: []
      }
      admin_salary_history: {
        Row: {
          achievement_percent: number
          actual_income: number
          admin_code: string
          bonus_amount: number
          bonus_percent: number
          created_at: string | null
          id: string
          month: string
          paid_at: string | null
          status: string
          target_omset: number
          updated_at: string | null
          year: number
        }
        Insert: {
          achievement_percent?: number
          actual_income?: number
          admin_code: string
          bonus_amount?: number
          bonus_percent?: number
          created_at?: string | null
          id?: string
          month: string
          paid_at?: string | null
          status?: string
          target_omset?: number
          updated_at?: string | null
          year: number
        }
        Update: {
          achievement_percent?: number
          actual_income?: number
          admin_code?: string
          bonus_amount?: number
          bonus_percent?: number
          created_at?: string | null
          id?: string
          month?: string
          paid_at?: string | null
          status?: string
          target_omset?: number
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      admin_target_settings: {
        Row: {
          admin_code: string
          bonus_100_percent: number
          bonus_150_percent: number
          bonus_80_percent: number
          created_at: string | null
          id: string
          target_omset: number
          updated_at: string | null
        }
        Insert: {
          admin_code: string
          bonus_100_percent?: number
          bonus_150_percent?: number
          bonus_80_percent?: number
          created_at?: string | null
          id?: string
          target_omset?: number
          updated_at?: string | null
        }
        Update: {
          admin_code?: string
          bonus_100_percent?: number
          bonus_150_percent?: number
          bonus_80_percent?: number
          created_at?: string | null
          id?: string
          target_omset?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: number
          keterangan: string | null
          nominal: number
          tanggal: string
        }
        Insert: {
          id?: number
          keterangan?: string | null
          nominal: number
          tanggal: string
        }
        Update: {
          id?: number
          keterangan?: string | null
          nominal?: number
          tanggal?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          role: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id: string
          role?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          role?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      report: {
        Row: {
          created_at: string
          daily_omset: number
          id: string
          tanggal: string
          total_admin_income: number
          total_expenses: number
          total_worker_income: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_omset?: number
          id?: string
          tanggal: string
          total_admin_income?: number
          total_expenses?: number
          total_worker_income?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_omset?: number
          id?: string
          tanggal?: string
          total_admin_income?: number
          total_expenses?: number
          total_worker_income?: number
          updated_at?: string
        }
        Relationships: []
      }
      salary_withdrawals: {
        Row: {
          amount: number
          catatan: string | null
          id: number
          tanggal: string
          worker: string
        }
        Insert: {
          amount: number
          catatan?: string | null
          id?: number
          tanggal?: string
          worker: string
        }
        Update: {
          amount?: number
          catatan?: string | null
          id?: number
          tanggal?: string
          worker?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      worker_income: {
        Row: {
          code: string
          fee: number
          id: number
          jobdesk: string
          tanggal: string
          worker: string
        }
        Insert: {
          code: string
          fee: number
          id?: number
          jobdesk: string
          tanggal: string
          worker: string
        }
        Update: {
          code?: string
          fee?: number
          id?: number
          jobdesk?: string
          tanggal?: string
          worker?: string
        }
        Relationships: []
      }
      worker_monthly_status: {
        Row: {
          created_at: string | null
          id: string
          month: string
          status: string
          total_income: number | null
          updated_at: string | null
          worker_name: string
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: string
          status?: string
          total_income?: number | null
          updated_at?: string | null
          worker_name: string
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: string
          status?: string
          total_income?: number | null
          updated_at?: string | null
          worker_name?: string
          year?: number
        }
        Relationships: []
      }
      workers: {
        Row: {
          created_at: string | null
          id: number
          nama: string
          nomor_wa: string | null
          rekening: string | null
          role: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          nama: string
          nomor_wa?: string | null
          rekening?: string | null
          role?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          nama?: string
          nomor_wa?: string | null
          rekening?: string | null
          role?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_highest_role: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user" | "admin_keuangan" | "public"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "user", "admin_keuangan", "public"],
    },
  },
} as const
