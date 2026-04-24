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
      at_bats: {
        Row: {
          batter_number: string | null
          batter_team: string | null
          confidence_level: number
          created_at: string
          execution: number
          game_id: string
          id: string
          inning: number
          mental_focus: number
          notes: string | null
          pitch_counts: Json
          pitches_seen: string | null
          player_id: string
        }
        Insert: {
          batter_number?: string | null
          batter_team?: string | null
          confidence_level: number
          created_at?: string
          execution: number
          game_id: string
          id?: string
          inning: number
          mental_focus: number
          notes?: string | null
          pitch_counts?: Json
          pitches_seen?: string | null
          player_id: string
        }
        Update: {
          batter_number?: string | null
          batter_team?: string | null
          confidence_level?: number
          created_at?: string
          execution?: number
          game_id?: string
          id?: string
          inning?: number
          mental_focus?: number
          notes?: string | null
          pitch_counts?: Json
          pitches_seen?: string | null
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "at_bats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      development_items: {
        Row: {
          coach_notes: string | null
          created_at: string
          drill_assigned: string | null
          id: string
          org_id: string
          player_id: string
          player_notes: string | null
          source_game_id: string | null
          source_note: string
          status: Database["public"]["Enums"]["dev_status"]
          updated_at: string
        }
        Insert: {
          coach_notes?: string | null
          created_at?: string
          drill_assigned?: string | null
          id?: string
          org_id: string
          player_id: string
          player_notes?: string | null
          source_game_id?: string | null
          source_note: string
          status?: Database["public"]["Enums"]["dev_status"]
          updated_at?: string
        }
        Update: {
          coach_notes?: string | null
          created_at?: string
          drill_assigned?: string | null
          id?: string
          org_id?: string
          player_id?: string
          player_notes?: string | null
          source_game_id?: string | null
          source_note?: string
          status?: Database["public"]["Enums"]["dev_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_items_source_game_id_fkey"
            columns: ["source_game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      diamond_decision_responses: {
        Row: {
          created_at: string
          game_id: string
          id: string
          inning: number
          player_id: string
          prompt_key: string
          prompt_text: string
          response: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          inning: number
          player_id: string
          prompt_key: string
          prompt_text: string
          response: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          inning?: number
          player_id?: string
          prompt_key?: string
          prompt_text?: string
          response?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diamond_decision_responses_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_assignments: {
        Row: {
          assignment: string
          created_at: string
          game_id: string
          id: string
          player_id: string
        }
        Insert: {
          assignment: string
          created_at?: string
          game_id: string
          id?: string
          player_id: string
        }
        Update: {
          assignment?: string
          created_at?: string
          game_id?: string
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_assignments_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          away_score: number
          away_team: string
          created_at: string
          created_by: string
          current_inning: number
          game_date: string
          game_type: Database["public"]["Enums"]["game_type"]
          home_score: number
          home_team: string
          id: string
          is_timed: boolean
          learning_focuses: string[] | null
          learning_phase: string | null
          opponent_id: string | null
          org_id: string
          status: Database["public"]["Enums"]["game_status"]
          time_limit_minutes: number | null
          timer_started_at: string | null
          tournament_name: string | null
        }
        Insert: {
          away_score?: number
          away_team: string
          created_at?: string
          created_by: string
          current_inning?: number
          game_date?: string
          game_type: Database["public"]["Enums"]["game_type"]
          home_score?: number
          home_team: string
          id?: string
          is_timed?: boolean
          learning_focuses?: string[] | null
          learning_phase?: string | null
          opponent_id?: string | null
          org_id: string
          status?: Database["public"]["Enums"]["game_status"]
          time_limit_minutes?: number | null
          timer_started_at?: string | null
          tournament_name?: string | null
        }
        Update: {
          away_score?: number
          away_team?: string
          created_at?: string
          created_by?: string
          current_inning?: number
          game_date?: string
          game_type?: Database["public"]["Enums"]["game_type"]
          home_score?: number
          home_team?: string
          id?: string
          is_timed?: boolean
          learning_focuses?: string[] | null
          learning_phase?: string | null
          opponent_id?: string | null
          org_id?: string
          status?: Database["public"]["Enums"]["game_status"]
          time_limit_minutes?: number | null
          timer_started_at?: string | null
          tournament_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "opponents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      opponents: {
        Row: {
          created_at: string
          id: string
          org_id: string
          team_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          team_name: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          team_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "opponents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          join_code: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          join_code: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          join_code?: string
          name?: string
        }
        Relationships: []
      }
      pinned_must_know: {
        Row: {
          created_at: string
          detail: string | null
          game_id: string
          id: string
          label: string
          observation_id: string | null
          pin_key: string
          pinned_by: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          game_id: string
          id?: string
          label: string
          observation_id?: string | null
          pin_key: string
          pinned_by: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          game_id?: string
          id?: string
          label?: string
          observation_id?: string | null
          pin_key?: string
          pinned_by?: string
        }
        Relationships: []
      }
      pitchers: {
        Row: {
          created_at: string
          game_id: string
          id: string
          is_active: boolean
          jersey_number: string
          name: string | null
          notes: string | null
          team_side: string | null
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          is_active?: boolean
          jersey_number: string
          name?: string | null
          notes?: string | null
          team_side?: string | null
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          is_active?: boolean
          jersey_number?: string
          name?: string | null
          notes?: string | null
          team_side?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pitchers_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          jersey_number: string | null
          org_id: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          jersey_number?: string | null
          org_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          jersey_number?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_observations: {
        Row: {
          applies_to_team: string | null
          created_at: string
          game_id: string
          id: string
          inning: number
          is_team_level: boolean
          jersey_number: string | null
          key_play: string | null
          offensive_team: string | null
          pitcher_id: string | null
          player_id: string
          steal_it: string | null
          synced: boolean
          tags: Json
        }
        Insert: {
          applies_to_team?: string | null
          created_at?: string
          game_id: string
          id?: string
          inning: number
          is_team_level?: boolean
          jersey_number?: string | null
          key_play?: string | null
          offensive_team?: string | null
          pitcher_id?: string | null
          player_id: string
          steal_it?: string | null
          synced?: boolean
          tags?: Json
        }
        Update: {
          applies_to_team?: string | null
          created_at?: string
          game_id?: string
          id?: string
          inning?: number
          is_team_level?: boolean
          jersey_number?: string | null
          key_play?: string | null
          offensive_team?: string | null
          pitcher_id?: string | null
          player_id?: string
          steal_it?: string | null
          synced?: boolean
          tags?: Json
        }
        Relationships: [
          {
            foreignKeyName: "scout_observations_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_observations_pitcher_id_fkey"
            columns: ["pitcher_id"]
            isOneToOne: false
            referencedRelation: "pitchers"
            referencedColumns: ["id"]
          },
        ]
      }
      scouting_reports: {
        Row: {
          coach_id: string
          created_at: string
          exported_at: string | null
          game_id: string
          game_plan_notes: string | null
          id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          exported_at?: string | null
          game_id: string
          game_plan_notes?: string | null
          id?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          exported_at?: string | null
          game_id?: string
          game_plan_notes?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scouting_reports_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      generate_join_code: { Args: never; Returns: string }
      get_my_org_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "head_coach" | "assistant_coach" | "player"
      dev_status: "working_on" | "got_it"
      game_status: "active" | "ended"
      game_type: "scout" | "learning"
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
      app_role: ["head_coach", "assistant_coach", "player"],
      dev_status: ["working_on", "got_it"],
      game_status: ["active", "ended"],
      game_type: ["scout", "learning"],
    },
  },
} as const
