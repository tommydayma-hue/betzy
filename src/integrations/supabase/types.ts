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
      bank_accounts: {
        Row: {
          account_holder_name: string
          account_number: string
          account_type: string | null
          bank_name: string | null
          created_at: string
          google_pay_number: string | null
          id: string
          ifsc_code: string | null
          is_primary: boolean | null
          paytm_number: string | null
          phone_pay_number: string | null
          updated_at: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          account_holder_name: string
          account_number: string
          account_type?: string | null
          bank_name?: string | null
          created_at?: string
          google_pay_number?: string | null
          id?: string
          ifsc_code?: string | null
          is_primary?: boolean | null
          paytm_number?: string | null
          phone_pay_number?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          account_type?: string | null
          bank_name?: string | null
          created_at?: string
          google_pay_number?: string | null
          id?: string
          ifsc_code?: string | null
          is_primary?: boolean | null
          paytm_number?: string | null
          phone_pay_number?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bets: {
        Row: {
          amount: number
          bet_type: string
          created_at: string
          id: string
          match_id: string
          odds: number
          potential_winnings: number
          settled_at: string | null
          status: Database["public"]["Enums"]["bet_status"]
          user_id: string
        }
        Insert: {
          amount: number
          bet_type: string
          created_at?: string
          id?: string
          match_id: string
          odds: number
          potential_winnings: number
          settled_at?: string | null
          status?: Database["public"]["Enums"]["bet_status"]
          user_id: string
        }
        Update: {
          amount?: number
          bet_type?: string
          created_at?: string
          id?: string
          match_id?: string
          odds?: number
          potential_winnings?: number
          settled_at?: string | null
          status?: Database["public"]["Enums"]["bet_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      coinflip_bets: {
        Row: {
          amount: number
          choice: string
          created_at: string
          id: string
          payout: number | null
          round_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          choice: string
          created_at?: string
          id?: string
          payout?: number | null
          round_id: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          choice?: string
          created_at?: string
          id?: string
          payout?: number | null
          round_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coinflip_bets_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "coinflip_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      coinflip_rounds: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          is_settled: boolean
          result: string | null
          round_number: number
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          is_settled?: boolean
          result?: string | null
          round_number?: number
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          is_settled?: boolean
          result?: string | null
          round_number?: number
          starts_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          closing_time: string | null
          created_at: string
          extra_time: string | null
          id: string
          info_image: string | null
          info_text_1: string | null
          info_text_2: string | null
          league: string | null
          max_bet: number | null
          odds_draw: number | null
          odds_team_a: number
          odds_team_b: number
          score_team_a: number | null
          score_team_b: number | null
          sport: string
          start_time: string
          status: Database["public"]["Enums"]["match_status"]
          team_a: string
          team_a_logo: string | null
          team_b: string
          team_b_logo: string | null
          toss_winner: string | null
          updated_at: string
          winner: string | null
        }
        Insert: {
          closing_time?: string | null
          created_at?: string
          extra_time?: string | null
          id?: string
          info_image?: string | null
          info_text_1?: string | null
          info_text_2?: string | null
          league?: string | null
          max_bet?: number | null
          odds_draw?: number | null
          odds_team_a?: number
          odds_team_b?: number
          score_team_a?: number | null
          score_team_b?: number | null
          sport: string
          start_time: string
          status?: Database["public"]["Enums"]["match_status"]
          team_a: string
          team_a_logo?: string | null
          team_b: string
          team_b_logo?: string | null
          toss_winner?: string | null
          updated_at?: string
          winner?: string | null
        }
        Update: {
          closing_time?: string | null
          created_at?: string
          extra_time?: string | null
          id?: string
          info_image?: string | null
          info_text_1?: string | null
          info_text_2?: string | null
          league?: string | null
          max_bet?: number | null
          odds_draw?: number | null
          odds_team_a?: number
          odds_team_b?: number
          score_team_a?: number | null
          score_team_b?: number | null
          sport?: string
          start_time?: string
          status?: Database["public"]["Enums"]["match_status"]
          team_a?: string
          team_a_logo?: string | null
          team_b?: string
          team_b_logo?: string | null
          toss_winner?: string | null
          updated_at?: string
          winner?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
          username: string | null
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
          wallet_balance?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          attachment_url: string | null
          category: string
          created_at: string
          id: string
          message: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          category: string
          created_at?: string
          id?: string
          message: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_replies: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          description: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          reference_id: string | null
          screenshot_url: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reference_id?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reference_id?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_approve_deposit: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      cancel_bet: { Args: { p_bet_id: string }; Returns: undefined }
      get_or_create_current_round: {
        Args: never
        Returns: {
          created_at: string
          ends_at: string
          id: string
          is_settled: boolean
          result: string | null
          round_number: number
          starts_at: string
        }
        SetofOptions: {
          from: "*"
          to: "coinflip_rounds"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_server_time: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      place_bet: {
        Args: { p_amount: number; p_bet_type: string; p_match_id: string }
        Returns: string
      }
      place_coinflip_bet: {
        Args: { p_amount: number; p_choice: string }
        Returns: Json
      }
      play_coinflip: {
        Args: { p_amount: number; p_choice: string }
        Returns: Json
      }
      process_deposit: {
        Args: {
          p_admin_notes?: string
          p_approved: boolean
          p_transaction_id: string
        }
        Returns: undefined
      }
      process_withdrawal: {
        Args: {
          p_admin_notes?: string
          p_approved: boolean
          p_transaction_id: string
        }
        Returns: undefined
      }
      settle_bet: {
        Args: { p_bet_id: string; p_won: boolean }
        Returns: undefined
      }
      settle_coinflip_round: { Args: { p_round_id: string }; Returns: Json }
      settle_coinflip_round_with_result: {
        Args: { p_result: string; p_round_id: string }
        Returns: Json
      }
      settle_toss_bets:
        | { Args: { p_match_id: string; p_toss_winner: string }; Returns: Json }
        | {
            Args: {
              p_match_id: string
              p_toss_time?: string
              p_toss_winner: string
            }
            Returns: Json
          }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      bet_status: "pending" | "won" | "lost" | "cancelled" | "refunded"
      match_status: "upcoming" | "live" | "completed" | "cancelled"
      transaction_status: "pending" | "completed" | "failed" | "cancelled"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "bet_placed"
        | "bet_won"
        | "bet_refunded"
        | "bonus"
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
      app_role: ["admin", "moderator", "user"],
      bet_status: ["pending", "won", "lost", "cancelled", "refunded"],
      match_status: ["upcoming", "live", "completed", "cancelled"],
      transaction_status: ["pending", "completed", "failed", "cancelled"],
      transaction_type: [
        "deposit",
        "withdrawal",
        "bet_placed",
        "bet_won",
        "bet_refunded",
        "bonus",
      ],
    },
  },
} as const
