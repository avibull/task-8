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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          ack_at: string | null
          created_at: string
          id: string
          recipient: string
          scheduled_at: string | null
          sender: string
          sent_at: string | null
          status: Database["public"]["Enums"]["alert_status"]
          task_id: string | null
          trigger: Database["public"]["Enums"]["alert_trigger"]
          type: Database["public"]["Enums"]["alert_type"]
        }
        Insert: {
          ack_at?: string | null
          created_at?: string
          id?: string
          recipient: string
          scheduled_at?: string | null
          sender: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          task_id?: string | null
          trigger?: Database["public"]["Enums"]["alert_trigger"]
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Update: {
          ack_at?: string | null
          created_at?: string
          id?: string
          recipient?: string
          scheduled_at?: string | null
          sender?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          task_id?: string | null
          trigger?: Database["public"]["Enums"]["alert_trigger"]
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: [
          {
            foreignKeyName: "alerts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          can_edit_tags: boolean
          created_at: string
          employee_id: string
          failed_attempts: number
          id: string
          is_active: boolean
          is_admin: boolean
          locked_until: string | null
          name: string
          phone: string
          updated_at: string
          username: string
        }
        Insert: {
          can_edit_tags?: boolean
          created_at?: string
          employee_id: string
          failed_attempts?: number
          id: string
          is_active?: boolean
          is_admin?: boolean
          locked_until?: string | null
          name: string
          phone: string
          updated_at?: string
          username: string
        }
        Update: {
          can_edit_tags?: boolean
          created_at?: string
          employee_id?: string
          failed_attempts?: number
          id?: string
          is_active?: boolean
          is_admin?: boolean
          locked_until?: string | null
          name?: string
          phone?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string[]
          completed: boolean
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          sort_order: number
          tags: string[]
          text: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string[]
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          sort_order?: number
          tags?: string[]
          text: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string[]
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          sort_order?: number
          tags?: string[]
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_tags: { Args: never; Returns: boolean }
      current_username: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      list_active_profiles: {
        Args: never
        Returns: {
          id: string
          is_active: boolean
          name: string
          username: string
        }[]
      }
    }
    Enums: {
      alert_status: "pending" | "acknowledged" | "scheduled"
      alert_trigger: "now" | "scheduled"
      alert_type: "normal" | "urgent"
      task_priority: "P1" | "P2" | "P3" | "Daily" | "None"
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
      alert_status: ["pending", "acknowledged", "scheduled"],
      alert_trigger: ["now", "scheduled"],
      alert_type: ["normal", "urgent"],
      task_priority: ["P1", "P2", "P3", "Daily", "None"],
    },
  },
} as const
