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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_auth_users: {
        Row: {
          account_id: string
          auth_user_id: string
          created_at: string
        }
        Insert: {
          account_id: string
          auth_user_id: string
          created_at?: string
        }
        Update: {
          account_id?: string
          auth_user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_auth_users_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      accounts: {
        Row: {
          blocked_reason: string | null
          created_at: string
          deleted_at: string | null
          id: string
          pending_delete_at: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          blocked_reason?: string | null
          created_at?: string
          deleted_at?: string | null
          id: string
          pending_delete_at?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          blocked_reason?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          pending_delete_at?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      answer_options: {
        Row: {
          answer_id: string
          created_at: string
          option_id: string
        }
        Insert: {
          answer_id: string
          created_at?: string
          option_id: string
        }
        Update: {
          answer_id?: string
          created_at?: string
          option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_options_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_options_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          created_at: string
          free_text: string | null
          id: string
          likert_value: number | null
          question_id: string
          response_id: string
        }
        Insert: {
          created_at?: string
          free_text?: string | null
          id?: string
          likert_value?: number | null
          question_id: string
          response_id: string
        }
        Update: {
          created_at?: string
          free_text?: string | null
          id?: string
          likert_value?: number | null
          question_id?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          contact_email: string | null
          created_at: string
          display_name: string | null
          first_seen_auth_provider: string | null
          id: string
          profile_completed_at: string | null
          profile_name_set_at: string | null
          support_label: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          display_name?: string | null
          first_seen_auth_provider?: string | null
          id: string
          profile_completed_at?: string | null
          profile_name_set_at?: string | null
          support_label?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          display_name?: string | null
          first_seen_auth_provider?: string | null
          id?: string
          profile_completed_at?: string | null
          profile_name_set_at?: string | null
          support_label?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      question_options: {
        Row: {
          created_at: string
          id: string
          label: string
          question_id: string
          sort_order: number
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          question_id: string
          sort_order?: number
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          question_id?: string
          sort_order?: number
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          allow_multiple: boolean
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          prompt: string
          scale_max: number | null
          scale_min: number | null
          scale_variant: Database["public"]["Enums"]["question_scale_variant"] | null
          section_id: string | null
          sort_order: number
          survey_id: string
          type: Database["public"]["Enums"]["question_type"]
          updated_at: string
          visualization_color_mode: Database["public"]["Enums"]["question_visualization_color_mode"]
          visualization_type: Database["public"]["Enums"]["question_visualization_type"]
        }
        Insert: {
          allow_multiple?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          prompt: string
          scale_max?: number | null
          scale_min?: number | null
          scale_variant?: Database["public"]["Enums"]["question_scale_variant"] | null
          section_id?: string | null
          sort_order?: number
          survey_id: string
          type: Database["public"]["Enums"]["question_type"]
          updated_at?: string
          visualization_color_mode?: Database["public"]["Enums"]["question_visualization_color_mode"]
          visualization_type?: Database["public"]["Enums"]["question_visualization_type"]
        }
        Update: {
          allow_multiple?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          prompt?: string
          scale_max?: number | null
          scale_min?: number | null
          scale_variant?: Database["public"]["Enums"]["question_scale_variant"] | null
          section_id?: string | null
          sort_order?: number
          survey_id?: string
          type?: Database["public"]["Enums"]["question_type"]
          updated_at?: string
          visualization_color_mode?: Database["public"]["Enums"]["question_visualization_color_mode"]
          visualization_type?: Database["public"]["Enums"]["question_visualization_type"]
        }
        Relationships: [
          {
            foreignKeyName: "questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "survey_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          anonymized_at: string | null
          created_at: string
          created_by_account_id: string | null
          id: string
          metadata: Json
          privacy_consent_given_at: string | null
          privacy_notice_snapshot: Json
          respondent_email: string | null
          respondent_name: string | null
          retention_due_at: string | null
          response_mode: Database["public"]["Enums"]["survey_response_mode"]
          submitted_at: string
          survey_id: string
        }
        Insert: {
          anonymized_at?: string | null
          created_at?: string
          created_by_account_id?: string | null
          id?: string
          metadata?: Json
          privacy_consent_given_at?: string | null
          privacy_notice_snapshot?: Json
          respondent_email?: string | null
          respondent_name?: string | null
          retention_due_at?: string | null
          response_mode: Database["public"]["Enums"]["survey_response_mode"]
          submitted_at?: string
          survey_id: string
        }
        Update: {
          anonymized_at?: string | null
          created_at?: string
          created_by_account_id?: string | null
          id?: string
          metadata?: Json
          privacy_consent_given_at?: string | null
          privacy_notice_snapshot?: Json
          respondent_email?: string | null
          respondent_name?: string | null
          retention_due_at?: string | null
          response_mode?: Database["public"]["Enums"]["survey_response_mode"]
          submitted_at?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_created_by_account_id_fkey"
            columns: ["created_by_account_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_privacy_settings: {
        Row: {
          consent_text: string | null
          controller_contact: string | null
          controller_name: string | null
          created_at: string
          enabled: boolean
          legal_basis: Database["public"]["Enums"]["survey_legal_basis"] | null
          legal_basis_note: string | null
          personal_data_expected: boolean
          purpose: string | null
          respondent_notice: string | null
          retention_action: Database["public"]["Enums"]["survey_retention_action"]
          retention_days: number | null
          survey_id: string
          updated_at: string
        }
        Insert: {
          consent_text?: string | null
          controller_contact?: string | null
          controller_name?: string | null
          created_at?: string
          enabled?: boolean
          legal_basis?: Database["public"]["Enums"]["survey_legal_basis"] | null
          legal_basis_note?: string | null
          personal_data_expected?: boolean
          purpose?: string | null
          respondent_notice?: string | null
          retention_action?: Database["public"]["Enums"]["survey_retention_action"]
          retention_days?: number | null
          survey_id: string
          updated_at?: string
        }
        Update: {
          consent_text?: string | null
          controller_contact?: string | null
          controller_name?: string | null
          created_at?: string
          enabled?: boolean
          legal_basis?: Database["public"]["Enums"]["survey_legal_basis"] | null
          legal_basis_note?: string | null
          personal_data_expected?: boolean
          purpose?: string | null
          respondent_notice?: string | null
          retention_action?: Database["public"]["Enums"]["survey_retention_action"]
          retention_days?: number | null
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_privacy_settings_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: true
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_privacy_events: {
        Row: {
          created_at: string
          details: Json
          event_type: Database["public"]["Enums"]["survey_privacy_event_type"]
          id: string
          response_id: string | null
          survey_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          event_type: Database["public"]["Enums"]["survey_privacy_event_type"]
          id?: string
          response_id?: string | null
          survey_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          event_type?: Database["public"]["Enums"]["survey_privacy_event_type"]
          id?: string
          response_id?: string | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_privacy_events_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_sections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          sort_order: number
          survey_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          survey_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          survey_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_sections_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          closed_at: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          owner_account_id: string | null
          published_at: string | null
          repeated_from_survey_id: string | null
          response_mode: Database["public"]["Enums"]["survey_response_mode"]
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["survey_status"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["survey_visibility"]
          workspace_id: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          owner_account_id?: string | null
          published_at?: string | null
          repeated_from_survey_id?: string | null
          response_mode?: Database["public"]["Enums"]["survey_response_mode"]
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["survey_status"]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["survey_visibility"]
          workspace_id?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          owner_account_id?: string
          published_at?: string | null
          repeated_from_survey_id?: string | null
          response_mode?: Database["public"]["Enums"]["survey_response_mode"]
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["survey_status"]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["survey_visibility"]
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_owner_account_id_fkey"
            columns: ["owner_account_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "surveys_repeated_from_survey_id_fkey"
            columns: ["repeated_from_survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_account_id: string | null
          created_at: string
          expires_at: string
          id: string
          invited_by_account_id: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["workspace_member_role"]
          token_hash: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_account_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by_account_id?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["workspace_member_role"]
          token_hash: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_account_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by_account_id?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["workspace_member_role"]
          token_hash?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_accepted_by_account_id_fkey"
            columns: ["accepted_by_account_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "workspace_invitations_invited_by_account_id_fkey"
            columns: ["invited_by_account_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          account_id: string
          created_at: string
          joined_at: string
          removed_at: string | null
          role: Database["public"]["Enums"]["workspace_member_role"]
          status: Database["public"]["Enums"]["workspace_member_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          joined_at?: string
          removed_at?: string | null
          role?: Database["public"]["Enums"]["workspace_member_role"]
          status?: Database["public"]["Enums"]["workspace_member_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          joined_at?: string
          removed_at?: string | null
          role?: Database["public"]["Enums"]["workspace_member_role"]
          status?: Database["public"]["Enums"]["workspace_member_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by_account_id: string | null
          id: string
          name: string
          organization_number: string | null
          slug: string
          status: Database["public"]["Enums"]["workspace_status"]
          type: Database["public"]["Enums"]["workspace_type"]
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          created_by_account_id?: string | null
          id?: string
          name: string
          organization_number?: string | null
          slug: string
          status?: Database["public"]["Enums"]["workspace_status"]
          type: Database["public"]["Enums"]["workspace_type"]
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          created_by_account_id?: string | null
          id?: string
          name?: string
          organization_number?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["workspace_status"]
          type?: Database["public"]["Enums"]["workspace_type"]
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_created_by_account_id_fkey"
            columns: ["created_by_account_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_identities: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          email_is_private: boolean
          id: string
          last_seen_at: string
          linked_at: string
          provider: string
          provider_display_name: string | null
          raw_app_meta: Json | null
          raw_user_meta: Json | null
          subject: string
          user_id: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          email_is_private?: boolean
          id?: string
          last_seen_at?: string
          linked_at?: string
          provider: string
          provider_display_name?: string | null
          raw_app_meta?: Json | null
          raw_user_meta?: Json | null
          subject: string
          user_id: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          email_is_private?: boolean
          id?: string
          last_seen_at?: string
          linked_at?: string
          provider?: string
          provider_display_name?: string | null
          raw_app_meta?: Json | null
          raw_user_meta?: Json | null
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          locale: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          locale?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          locale?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_workspace_invitation: {
        Args: { p_token: string }
        Returns: string
      }
      create_workspace: {
        Args: {
          p_name: string
          p_organization_number?: string | null
          p_type: Database["public"]["Enums"]["workspace_type"]
        }
        Returns: string
      }
      create_workspace_invitation: {
        Args: {
          p_expires_in_days?: number
          p_role?: Database["public"]["Enums"]["workspace_member_role"]
          p_workspace_id: string
        }
        Returns: string
      }
      create_survey_draft: {
        Args: {
          p_description?: string | null
          p_ends_at?: string | null
          p_response_mode?: Database["public"]["Enums"]["survey_response_mode"]
          p_slug?: string | null
          p_starts_at?: string | null
          p_title?: string | null
          p_visibility?: Database["public"]["Enums"]["survey_visibility"]
          p_workspace_id?: string | null
        }
        Returns: Database["public"]["Tables"]["surveys"]["Row"]
      }
      delete_account_data_for_auth_user: {
        Args: { p_auth_user_id: string }
        Returns: string | null
      }
      delete_survey: {
        Args: { p_survey_id: string }
        Returns: undefined
      }
      delete_workspace: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      ensure_account_initialized_v2: { Args: never; Returns: string }
      ensure_domain_account: { Args: never; Returns: string }
      ensure_user: { Args: never; Returns: string }
      remove_workspace_member: {
        Args: { p_account_id: string; p_workspace_id: string }
        Returns: undefined
      }
      publish_survey: {
        Args: { p_survey_id: string }
        Returns: Database["public"]["Tables"]["surveys"]["Row"]
      }
      repeat_survey_once: {
        Args: { p_survey_id: string }
        Returns: string
      }
      update_survey_privacy_settings: {
        Args: {
          p_consent_text?: string | null
          p_controller_contact?: string | null
          p_controller_name?: string | null
          p_enabled: boolean
          p_legal_basis?: Database["public"]["Enums"]["survey_legal_basis"] | null
          p_legal_basis_note?: string | null
          p_personal_data_expected: boolean
          p_purpose?: string | null
          p_respondent_notice?: string | null
          p_retention_action?: Database["public"]["Enums"]["survey_retention_action"]
          p_retention_days?: number | null
          p_survey_id: string
        }
        Returns: Database["public"]["Tables"]["survey_privacy_settings"]["Row"]
      }
      sync_my_identity: {
        Args: {
          p_email?: string
          p_email_is_private?: boolean
          p_provider: string
          p_provider_display_name?: string
          p_raw_app_meta?: Json
          p_raw_user_meta?: Json
          p_subject: string
        }
        Returns: string
      }
      submit_survey_response: {
        Args: {
          p_answers: Json
          p_metadata?: Json
          p_privacy_consent_given?: boolean
          p_respondent_email?: string | null
          p_respondent_name?: string | null
          p_survey_slug: string
        }
        Returns: string
      }
    }
    Enums: {
      account_status: "active" | "blocked" | "pending_delete" | "deleted"
      question_type:
        | "multiple_choice"
        | "free_text"
        | "likert_1_5"
        | "likert_scale"
      question_scale_variant: "buttons" | "stars" | "nps"
      question_visualization_color_mode: "muted" | "colorful"
      question_visualization_type: "bar" | "pie" | "word_cloud" | "list"
      survey_legal_basis:
        | "consent"
        | "legitimate_interests"
        | "contract"
        | "legal_obligation"
        | "public_task"
        | "other"
      survey_privacy_event_type: "response_deleted" | "response_anonymized"
      survey_retention_action: "delete_response" | "anonymize_response"
      survey_response_mode: "anonymous" | "identified"
      survey_status: "draft" | "published" | "closed"
      survey_visibility: "private" | "workspace"
      workspace_member_role: "owner" | "admin" | "member"
      workspace_member_status: "active" | "removed"
      workspace_status: "active" | "deleted"
      workspace_type: "business" | "team"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["active", "blocked", "pending_delete", "deleted"],
      question_type: [
        "multiple_choice",
        "free_text",
        "likert_1_5",
        "likert_scale",
      ],
      question_scale_variant: ["buttons", "stars", "nps"],
      question_visualization_color_mode: ["muted", "colorful"],
      question_visualization_type: ["bar", "pie", "word_cloud", "list"],
      survey_legal_basis: [
        "consent",
        "legitimate_interests",
        "contract",
        "legal_obligation",
        "public_task",
        "other",
      ],
      survey_privacy_event_type: ["response_deleted", "response_anonymized"],
      survey_retention_action: ["delete_response", "anonymize_response"],
      survey_response_mode: ["anonymous", "identified"],
      survey_status: ["draft", "published", "closed"],
      survey_visibility: ["private", "workspace"],
      workspace_member_role: ["owner", "admin", "member"],
      workspace_member_status: ["active", "removed"],
      workspace_status: ["active", "deleted"],
      workspace_type: ["business", "team"],
    },
  },
} as const
