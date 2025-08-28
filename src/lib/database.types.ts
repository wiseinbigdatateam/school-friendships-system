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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ai_reports: {
        Row: {
          created_at: string | null
          current_status: string
          expected_outcomes: Json
          guidance_plan: string
          id: string
          monitoring_points: Json
          risk_assessment: string
          specific_actions: Json
          student_id: string
          summary: string
          survey_id: string | null
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_status: string
          expected_outcomes: Json
          guidance_plan: string
          id?: string
          monitoring_points: Json
          risk_assessment: string
          specific_actions: Json
          student_id: string
          summary: string
          survey_id?: string | null
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_status?: string
          expected_outcomes?: Json
          guidance_plan?: string
          id?: string
          monitoring_points?: Json
          risk_assessment?: string
          specific_actions?: Json
          student_id?: string
          summary?: string
          survey_id?: string | null
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_reports_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_inquiries: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      data_transfer_requests: {
        Row: {
          approval_notes: string | null
          completed_at: string | null
          data_types: string[]
          from_school_id: string | null
          id: string
          justification: string | null
          parent_consent_id: string | null
          processed_at: string | null
          request_type: string
          requested_at: string | null
          requested_by: string | null
          status: string
          student_id: string | null
          to_school_id: string | null
        }
        Insert: {
          approval_notes?: string | null
          completed_at?: string | null
          data_types: string[]
          from_school_id?: string | null
          id?: string
          justification?: string | null
          parent_consent_id?: string | null
          processed_at?: string | null
          request_type: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string
          student_id?: string | null
          to_school_id?: string | null
        }
        Update: {
          approval_notes?: string | null
          completed_at?: string | null
          data_types?: string[]
          from_school_id?: string | null
          id?: string
          justification?: string | null
          parent_consent_id?: string | null
          processed_at?: string | null
          request_type?: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string
          student_id?: string | null
          to_school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_transfer_requests_from_school_id_fkey"
            columns: ["from_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_transfer_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_transfer_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_transfer_requests_to_school_id_fkey"
            columns: ["to_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_parent_consent"
            columns: ["parent_consent_id"]
            isOneToOne: false
            referencedRelation: "parent_consents"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          address: string | null
          code: string
          contact_info: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          region: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code: string
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          region: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          region?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      friendship_data: {
        Row: {
          created_at: string | null
          friend_student_id: string | null
          id: string
          metadata: Json | null
          relationship_type: string
          strength_score: number | null
          student_id: string | null
          survey_id: string | null
        }
        Insert: {
          created_at?: string | null
          friend_student_id?: string | null
          id?: string
          metadata?: Json | null
          relationship_type: string
          strength_score?: number | null
          student_id?: string | null
          survey_id?: string | null
        }
        Update: {
          created_at?: string | null
          friend_student_id?: string | null
          id?: string
          metadata?: Json | null
          relationship_type?: string
          strength_score?: number | null
          student_id?: string | null
          survey_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friendship_data_friend_student_id_fkey"
            columns: ["friend_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendship_data_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendship_data_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_logs: {
        Row: {
          created_at: string | null
          description: string
          effectiveness_score: number | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          intervention_type: string
          outcome: string | null
          student_id: string | null
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          effectiveness_score?: number | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          intervention_type: string
          outcome?: string | null
          student_id?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          effectiveness_score?: number | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          intervention_type?: string
          outcome?: string | null
          student_id?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_logs_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      network_analysis_results: {
        Row: {
          analysis_type: string
          calculated_at: string | null
          centrality_scores: Json | null
          community_membership: string | null
          id: string
          recommendations: Json | null
          risk_indicators: Json | null
          student_id: string | null
          survey_id: string | null
        }
        Insert: {
          analysis_type: string
          calculated_at?: string | null
          centrality_scores?: Json | null
          community_membership?: string | null
          id?: string
          recommendations?: Json | null
          risk_indicators?: Json | null
          student_id?: string | null
          survey_id?: string | null
        }
        Update: {
          analysis_type?: string
          calculated_at?: string | null
          centrality_scores?: Json | null
          community_membership?: string | null
          id?: string
          recommendations?: Json | null
          risk_indicators?: Json | null
          student_id?: string | null
          survey_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "network_analysis_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_analysis_results_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_consents: {
        Row: {
          consent_date: string | null
          consent_given: boolean
          consent_type: string
          created_at: string | null
          digital_signature: string | null
          id: string
          ip_address: unknown | null
          parent_contact: Json
          parent_name: string
          revoked_at: string | null
          student_id: string | null
          valid_until: string | null
        }
        Insert: {
          consent_date?: string | null
          consent_given: boolean
          consent_type: string
          created_at?: string | null
          digital_signature?: string | null
          id?: string
          ip_address?: unknown | null
          parent_contact: Json
          parent_name: string
          revoked_at?: string | null
          student_id?: string | null
          valid_until?: string | null
        }
        Update: {
          consent_date?: string | null
          consent_given?: boolean
          consent_type?: string
          created_at?: string | null
          digital_signature?: string | null
          id?: string
          ip_address?: unknown | null
          parent_contact?: Json
          parent_name?: string
          revoked_at?: string | null
          student_id?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_consents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      role_requests: {
        Row: {
          approval_notes: string | null
          created_at: string | null
          id: string
          reason: string | null
          requested_role: string
          school_id: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approval_notes?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          requested_role: string
          school_id?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approval_notes?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          requested_role?: string
          school_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          code: string
          contact_info: Json | null
          created_at: string | null
          district_id: string | null
          established_date: string | null
          id: string
          is_active: boolean | null
          name: string
          school_type: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code: string
          contact_info?: Json | null
          created_at?: string | null
          district_id?: string | null
          established_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          school_type: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          contact_info?: Json | null
          created_at?: string | null
          district_id?: string | null
          established_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          school_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      student_school_history: {
        Row: {
          created_at: string | null
          end_date: string | null
          grade_at_entry: string
          id: string
          is_current: boolean | null
          reason_for_transfer: string | null
          school_id: string | null
          start_date: string
          student_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          grade_at_entry: string
          id?: string
          is_current?: boolean | null
          reason_for_transfer?: string | null
          school_id?: string | null
          start_date: string
          student_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          grade_at_entry?: string
          id?: string
          is_current?: boolean | null
          reason_for_transfer?: string | null
          school_id?: string | null
          start_date?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_school_history_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_school_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          birth_date: string
          class: string
          created_at: string | null
          current_school_id: string | null
          enrolled_at: string
          gender: string
          grade: string
          id: string
          is_active: boolean | null
          lifelong_education_id: string
          name: string
          parent_contact: Json | null
          student_number: string
          updated_at: string | null
        }
        Insert: {
          birth_date: string
          class: string
          created_at?: string | null
          current_school_id?: string | null
          enrolled_at: string
          gender: string
          grade: string
          id?: string
          is_active?: boolean | null
          lifelong_education_id: string
          name: string
          parent_contact?: Json | null
          student_number: string
          updated_at?: string | null
        }
        Update: {
          birth_date?: string
          class?: string
          created_at?: string | null
          current_school_id?: string | null
          enrolled_at?: string
          gender?: string
          grade?: string
          id?: string
          is_active?: boolean | null
          lifelong_education_id?: string
          name?: string
          parent_contact?: Json | null
          student_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_current_school_id_fkey"
            columns: ["current_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          id: string
          ip_address: unknown | null
          responses: Json
          student_id: string | null
          submitted_at: string | null
          survey_id: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          ip_address?: unknown | null
          responses: Json
          student_id?: string | null
          submitted_at?: string | null
          survey_id?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          ip_address?: unknown | null
          responses?: Json
          student_id?: string | null
          submitted_at?: string | null
          survey_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
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
      survey_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_selections: number | null
          metadata: Json | null
          name: string
          questions: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_selections?: number | null
          metadata?: Json | null
          name: string
          questions: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_selections?: number | null
          metadata?: Json | null
          name?: string
          questions?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          questions: Json | null
          school_id: string | null
          settings: Json | null
          start_date: string
          status: string
          target_classes: string[] | null
          target_grades: string[] | null
          template_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          questions?: Json | null
          school_id?: string | null
          settings?: Json | null
          start_date: string
          status?: string
          target_classes?: string[] | null
          target_grades?: string[] | null
          template_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          questions?: Json | null
          school_id?: string | null
          settings?: Json | null
          start_date?: string
          status?: string
          target_classes?: string[] | null
          target_grades?: string[] | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "survey_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_memos: {
        Row: {
          content: string
          created_at: string | null
          id: string
          memo_type: string
          student_id: string | null
          tags: string[] | null
          teacher_id: string | null
          updated_at: string | null
          visibility: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          memo_type: string
          student_id?: string | null
          tags?: string[] | null
          teacher_id?: string | null
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          memo_type?: string
          student_id?: string | null
          tags?: string[] | null
          teacher_id?: string | null
          updated_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_memos_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_memos_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          class_number: string | null
          contact_info: Json | null
          created_at: string | null
          department: string | null
          district_id: string | null
          email: string
          employee_id: string
          grade_level: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          name: string
          password_hash: string | null
          permissions: Json | null
          role: string
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          class_number?: string | null
          contact_info?: Json | null
          created_at?: string | null
          department?: string | null
          district_id?: string | null
          email: string
          employee_id: string
          grade_level?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          name: string
          password_hash?: string | null
          permissions?: Json | null
          role: string
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          class_number?: string | null
          contact_info?: Json | null
          created_at?: string | null
          department?: string | null
          district_id?: string | null
          email?: string
          employee_id?: string
          grade_level?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          name?: string
          password_hash?: string | null
          permissions?: Json | null
          role?: string
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const