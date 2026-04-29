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
          team_id: string | null
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
          team_id?: string | null
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
          team_id?: string | null
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
          {
            foreignKeyName: "games_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      org_invite_links: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          max_uses: number | null
          org_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          team_id: string | null
          token: string
          updated_at: string
          uses_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          org_id: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          team_id?: string | null
          token: string
          updated_at?: string
          uses_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          org_id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string | null
          token?: string
          updated_at?: string
          uses_count?: number
        }
        Relationships: []
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
      pitch_code_map: {
        Row: {
          created_at: string
          id: string
          numeric_code: string
          org_id: string
          pitch_type_id: string
          pitcher_id: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          numeric_code: string
          org_id: string
          pitch_type_id: string
          pitcher_id?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          numeric_code?: string
          org_id?: string
          pitch_type_id?: string
          pitcher_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pitch_code_map_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pitch_entries: {
        Row: {
          ab_result: string | null
          at_bat_seq: number
          balls_after: number
          balls_before: number
          batter_key: string
          batter_number: string
          batter_team: string
          contact_quality: string | null
          created_at: string
          game_id: string
          id: string
          inning: number
          logged_by: string
          numeric_code: string | null
          pitch_seq: number
          pitch_type_id: string | null
          pitcher_id: string
          result: string
          spray_zone: string | null
          strikes_after: number
          strikes_before: number
        }
        Insert: {
          ab_result?: string | null
          at_bat_seq: number
          balls_after: number
          balls_before: number
          batter_key: string
          batter_number: string
          batter_team: string
          contact_quality?: string | null
          created_at?: string
          game_id: string
          id?: string
          inning: number
          logged_by: string
          numeric_code?: string | null
          pitch_seq: number
          pitch_type_id?: string | null
          pitcher_id: string
          result: string
          spray_zone?: string | null
          strikes_after: number
          strikes_before: number
        }
        Update: {
          ab_result?: string | null
          at_bat_seq?: number
          balls_after?: number
          balls_before?: number
          batter_key?: string
          batter_number?: string
          batter_team?: string
          contact_quality?: string | null
          created_at?: string
          game_id?: string
          id?: string
          inning?: number
          logged_by?: string
          numeric_code?: string | null
          pitch_seq?: number
          pitch_type_id?: string | null
          pitcher_id?: string
          result?: string
          spray_zone?: string | null
          strikes_after?: number
          strikes_before?: number
        }
        Relationships: []
      }
      pitch_lineups: {
        Row: {
          created_at: string
          finalized: boolean
          game_id: string
          id: string
          lineup: Json
          team: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          finalized?: boolean
          game_id: string
          id?: string
          lineup?: Json
          team: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          finalized?: boolean
          game_id?: string
          id?: string
          lineup?: Json
          team?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pitch_lineups_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      pitch_types: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          org_id: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
          org_id: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          org_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      pitchers: {
        Row: {
          created_at: string
          game_id: string | null
          id: string
          is_active: boolean
          jersey_number: string
          name: string | null
          notes: string | null
          team_id: string | null
          team_side: string | null
        }
        Insert: {
          created_at?: string
          game_id?: string | null
          id?: string
          is_active?: boolean
          jersey_number: string
          name?: string | null
          notes?: string | null
          team_id?: string | null
          team_side?: string | null
        }
        Update: {
          created_at?: string
          game_id?: string | null
          id?: string
          is_active?: boolean
          jersey_number?: string
          name?: string | null
          notes?: string | null
          team_id?: string | null
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
          active_team_id: string | null
          created_at: string
          full_name: string
          id: string
          jersey_number: string | null
          org_id: string | null
        }
        Insert: {
          active_team_id?: string | null
          created_at?: string
          full_name: string
          id: string
          jersey_number?: string | null
          org_id?: string | null
        }
        Update: {
          active_team_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          jersey_number?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_team_id_fkey"
            columns: ["active_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
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
      team_memberships: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: []
      }
      team_roster: {
        Row: {
          bat_order: number | null
          created_at: string
          id: string
          jersey_number: string
          name: string | null
          position: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          bat_order?: number | null
          created_at?: string
          id?: string
          jersey_number: string
          name?: string | null
          position?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          bat_order?: number | null
          created_at?: string
          id?: string
          jersey_number?: string
          name?: string | null
          position?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_roster_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          age_group: string | null
          created_at: string
          created_by: string
          id: string
          join_code: string
          logo_url: string | null
          name: string
          org_id: string
          season: string | null
          updated_at: string
        }
        Insert: {
          age_group?: string | null
          created_at?: string
          created_by: string
          id?: string
          join_code: string
          logo_url?: string | null
          name: string
          org_id: string
          season?: string | null
          updated_at?: string
        }
        Update: {
          age_group?: string | null
          created_at?: string
          created_by?: string
          id?: string
          join_code?: string
          logo_url?: string | null
          name?: string
          org_id?: string
          season?: string | null
          updated_at?: string
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
      complete_head_coach_onboarding: {
        Args: { _age_group: string; _team_name: string }
        Returns: {
          org_id: string
          reason: string
          success: boolean
          team_id: string
        }[]
      }
      generate_join_code: { Args: never; Returns: string }
      get_invite_preview: {
        Args: { _token: string }
        Returns: {
          is_valid: boolean
          org_name: string
          reason: string
          role: Database["public"]["Enums"]["app_role"]
          team_name: string
        }[]
      }
      get_my_org_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_invite: {
        Args: { _token: string }
        Returns: {
          org_id: string
          reason: string
          role: Database["public"]["Enums"]["app_role"]
          success: boolean
        }[]
      }
    }
    Enums: {
      app_role: "head_coach" | "assistant_coach" | "player"
      dev_status: "working_on" | "got_it"
      game_status: "active" | "ended"
      game_type: "scout" | "learning" | "pitch"
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
      game_type: ["scout", "learning", "pitch"],
    },
  },
} as const
