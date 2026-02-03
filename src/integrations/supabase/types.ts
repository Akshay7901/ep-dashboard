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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["reviewer_role"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          role?: Database["public"]["Enums"]["reviewer_role"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["reviewer_role"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proposal_attachments: {
        Row: {
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          proposal_id: string
          uploaded_at: string
        }
        Insert: {
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          proposal_id: string
          uploaded_at?: string
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          proposal_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_attachments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          author_email: string
          author_name: string
          author_phone: string | null
          contract_sent: boolean | null
          contract_sent_at: string | null
          created_at: string
          description: string | null
          finalised_at: string | null
          finalised_by: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["proposal_status"]
          updated_at: string
          value: number | null
        }
        Insert: {
          author_email: string
          author_name: string
          author_phone?: string | null
          contract_sent?: boolean | null
          contract_sent_at?: string | null
          created_at?: string
          description?: string | null
          finalised_at?: string | null
          finalised_by?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["proposal_status"]
          updated_at?: string
          value?: number | null
        }
        Update: {
          author_email?: string
          author_name?: string
          author_phone?: string | null
          contract_sent?: boolean | null
          contract_sent_at?: string | null
          created_at?: string
          description?: string | null
          finalised_at?: string | null
          finalised_by?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["proposal_status"]
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      reviewer_comments: {
        Row: {
          comment_text: string | null
          created_at: string
          id: string
          is_duplicate_of: string | null
          proposal_id: string
          review_form_data: Json | null
          reviewer_id: string
          submitted_for_authorization: boolean | null
          updated_at: string
        }
        Insert: {
          comment_text?: string | null
          created_at?: string
          id?: string
          is_duplicate_of?: string | null
          proposal_id: string
          review_form_data?: Json | null
          reviewer_id: string
          submitted_for_authorization?: boolean | null
          updated_at?: string
        }
        Update: {
          comment_text?: string | null
          created_at?: string
          id?: string
          is_duplicate_of?: string | null
          proposal_id?: string
          review_form_data?: Json | null
          reviewer_id?: string
          submitted_for_authorization?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviewer_comments_is_duplicate_of_fkey"
            columns: ["is_duplicate_of"]
            isOneToOne: false
            referencedRelation: "reviewer_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviewer_comments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          new_status: Database["public"]["Enums"]["proposal_status"] | null
          previous_status: Database["public"]["Enums"]["proposal_status"] | null
          proposal_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          new_status?: Database["public"]["Enums"]["proposal_status"] | null
          previous_status?:
            | Database["public"]["Enums"]["proposal_status"]
            | null
          proposal_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          new_status?: Database["public"]["Enums"]["proposal_status"] | null
          previous_status?:
            | Database["public"]["Enums"]["proposal_status"]
            | null
          proposal_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_logs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["reviewer_role"]
      }
      is_proposal_locked: { Args: { p_proposal_id: string }; Returns: boolean }
      is_reviewer: { Args: never; Returns: boolean }
      is_reviewer_1: { Args: never; Returns: boolean }
      is_reviewer_2: { Args: never; Returns: boolean }
    }
    Enums: {
      proposal_status:
        | "submitted"
        | "under_review"
        | "approved"
        | "finalised"
        | "rejected"
        | "locked"
      reviewer_role: "reviewer_1" | "reviewer_2"
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
      proposal_status: [
        "submitted",
        "under_review",
        "approved",
        "finalised",
        "rejected",
        "locked",
      ],
      reviewer_role: ["reviewer_1", "reviewer_2"],
    },
  },
} as const
