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
      ai_booking_calls: {
        Row: {
          appointment_id: string
          created_at: string
          ended_at: string | null
          error_message: string | null
          id: string
          outcome: string | null
          phone_number: string
          provider_call_sid: string | null
          started_at: string
          status: Database["public"]["Enums"]["ai_call_status"]
          summary: Json
          telephony_provider: string
          transcript: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          ended_at?: string | null
          error_message?: string | null
          id?: string
          outcome?: string | null
          phone_number: string
          provider_call_sid?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["ai_call_status"]
          summary?: Json
          telephony_provider?: string
          transcript?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          ended_at?: string | null
          error_message?: string | null
          id?: string
          outcome?: string | null
          phone_number?: string
          provider_call_sid?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["ai_call_status"]
          summary?: Json
          telephony_provider?: string
          transcript?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_booking_calls_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at: string
          family_member_id: string | null
          id: string
          message: string
          priority: Database["public"]["Enums"]["alert_priority"]
          read_at: string | null
          receiver_id: string | null
          sender_id: string
          status: Database["public"]["Enums"]["alert_status"]
        }
        Insert: {
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          family_member_id?: string | null
          id?: string
          message: string
          priority?: Database["public"]["Enums"]["alert_priority"]
          read_at?: string | null
          receiver_id?: string | null
          sender_id: string
          status?: Database["public"]["Enums"]["alert_status"]
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          family_member_id?: string | null
          id?: string
          message?: string
          priority?: Database["public"]["Enums"]["alert_priority"]
          read_at?: string | null
          receiver_id?: string | null
          sender_id?: string
          status?: Database["public"]["Enums"]["alert_status"]
        }
        Relationships: [
          {
            foreignKeyName: "alerts_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_reminders: {
        Row: {
          appointment_id: string
          channel: Database["public"]["Enums"]["reminder_channel"]
          created_at: string
          id: string
          message: string
          offset_minutes: number
          remind_at: string
          sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_id: string
          channel?: Database["public"]["Enums"]["reminder_channel"]
          created_at?: string
          id?: string
          message: string
          offset_minutes?: number
          remind_at: string
          sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_id?: string
          channel?: Database["public"]["Enums"]["reminder_channel"]
          created_at?: string
          id?: string
          message?: string
          offset_minutes?: number
          remind_at?: string
          sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          booking_source: Database["public"]["Enums"]["appointment_booking_source"]
          confirmed_date: string | null
          confirmed_time: string | null
          consultation_fee: string | null
          contact_number: string
          created_at: string
          department: string | null
          doctor_name: string | null
          family_member_id: string | null
          id: string
          location: string | null
          notes: string | null
          patient_contact: string | null
          patient_name: string | null
          preferred_date: string | null
          preferred_time: string | null
          provider_name: string
          provider_type: Database["public"]["Enums"]["appointment_provider_type"]
          reason: string | null
          share_patient_contact: boolean
          special_instructions: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          token_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_source?: Database["public"]["Enums"]["appointment_booking_source"]
          confirmed_date?: string | null
          confirmed_time?: string | null
          consultation_fee?: string | null
          contact_number: string
          created_at?: string
          department?: string | null
          doctor_name?: string | null
          family_member_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          patient_contact?: string | null
          patient_name?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          provider_name: string
          provider_type?: Database["public"]["Enums"]["appointment_provider_type"]
          reason?: string | null
          share_patient_contact?: boolean
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          token_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_source?: Database["public"]["Enums"]["appointment_booking_source"]
          confirmed_date?: string | null
          confirmed_time?: string | null
          consultation_fee?: string | null
          contact_number?: string
          created_at?: string
          department?: string | null
          doctor_name?: string | null
          family_member_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          patient_contact?: string | null
          patient_name?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          provider_name?: string
          provider_type?: Database["public"]["Enums"]["appointment_provider_type"]
          reason?: string | null
          share_patient_contact?: boolean
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          token_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          call_status: Database["public"]["Enums"]["call_status"]
          caller_id: string
          created_at: string
          family_member_id: string | null
          id: string
          phone_number: string
        }
        Insert: {
          call_status?: Database["public"]["Enums"]["call_status"]
          caller_id: string
          created_at?: string
          family_member_id?: string | null
          id?: string
          phone_number: string
        }
        Update: {
          call_status?: Database["public"]["Enums"]["call_status"]
          caller_id?: string
          created_at?: string
          family_member_id?: string | null
          id?: string
          phone_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          availability_status: Database["public"]["Enums"]["availability_status"]
          created_at: string
          email: string | null
          id: string
          is_emergency_contact: boolean
          linked_user_id: string | null
          name: string
          notification_enabled: boolean
          phone_number: string
          profile_photo: string | null
          relationship: Database["public"]["Enums"]["relationship_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_status?: Database["public"]["Enums"]["availability_status"]
          created_at?: string
          email?: string | null
          id?: string
          is_emergency_contact?: boolean
          linked_user_id?: string | null
          name: string
          notification_enabled?: boolean
          phone_number: string
          profile_photo?: string | null
          relationship?: Database["public"]["Enums"]["relationship_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_status?: Database["public"]["Enums"]["availability_status"]
          created_at?: string
          email?: string | null
          id?: string
          is_emergency_contact?: boolean
          linked_user_id?: string | null
          name?: string
          notification_enabled?: boolean
          phone_number?: string
          profile_photo?: string | null
          relationship?: Database["public"]["Enums"]["relationship_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medical_reports: {
        Row: {
          ai_summary: string | null
          analysis: Json
          chat: Json
          created_at: string
          doctor_questions: Json
          error_message: string | null
          extracted_text: string | null
          family_member_id: string | null
          file_name: string
          file_path: string | null
          file_type: string
          id: string
          important_findings: Json
          ocr_confidence: number | null
          patient_label: string
          processing_status: Database["public"]["Enums"]["report_status"]
          report_type: string
          simple_explanation: string | null
          source: string
          structured_results: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          analysis?: Json
          chat?: Json
          created_at?: string
          doctor_questions?: Json
          error_message?: string | null
          extracted_text?: string | null
          family_member_id?: string | null
          file_name: string
          file_path?: string | null
          file_type?: string
          id?: string
          important_findings?: Json
          ocr_confidence?: number | null
          patient_label?: string
          processing_status?: Database["public"]["Enums"]["report_status"]
          report_type?: string
          simple_explanation?: string | null
          source?: string
          structured_results?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          analysis?: Json
          chat?: Json
          created_at?: string
          doctor_questions?: Json
          error_message?: string | null
          extracted_text?: string | null
          family_member_id?: string | null
          file_name?: string
          file_path?: string | null
          file_type?: string
          id?: string
          important_findings?: Json
          ocr_confidence?: number | null
          patient_label?: string
          processing_status?: Database["public"]["Enums"]["report_status"]
          report_type?: string
          simple_explanation?: string | null
          source?: string
          structured_results?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_reports_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine_scans: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          info: Json
          is_favorite: boolean
          language: string
          medicine_name: string
          raw_text: string | null
          scan_type: Database["public"]["Enums"]["medicine_scan_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          info?: Json
          is_favorite?: boolean
          language?: string
          medicine_name?: string
          raw_text?: string | null
          scan_type?: Database["public"]["Enums"]["medicine_scan_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          info?: Json
          is_favorite?: boolean
          language?: string
          medicine_name?: string
          raw_text?: string | null
          scan_type?: Database["public"]["Enums"]["medicine_scan_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ai_call_status:
        | "pending"
        | "dialing"
        | "in_progress"
        | "completed"
        | "failed"
        | "cancelled"
      alert_priority: "low" | "normal" | "high" | "critical"
      alert_status: "unread" | "read" | "dismissed"
      alert_type: "normal" | "important" | "emergency" | "call_back_request"
      appointment_booking_source: "manual" | "ai" | "direct_call"
      appointment_provider_type: "doctor" | "hospital" | "clinic"
      appointment_status:
        | "pending"
        | "confirmed"
        | "today"
        | "completed"
        | "cancelled"
        | "failed"
      availability_status: "available" | "busy" | "away" | "offline" | "dnd"
      call_status: "initiated" | "missed" | "completed" | "busy" | "declined"
      medicine_scan_type: "camera" | "barcode" | "qr"
      relationship_type:
        | "father"
        | "mother"
        | "brother"
        | "sister"
        | "son"
        | "daughter"
        | "spouse"
        | "guardian"
        | "doctor"
        | "other"
      reminder_channel: "in_app" | "sms"
      report_status: "uploading" | "processing" | "complete" | "failed"
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
      ai_call_status: [
        "pending",
        "dialing",
        "in_progress",
        "completed",
        "failed",
        "cancelled",
      ],
      alert_priority: ["low", "normal", "high", "critical"],
      alert_status: ["unread", "read", "dismissed"],
      alert_type: ["normal", "important", "emergency", "call_back_request"],
      appointment_booking_source: ["manual", "ai", "direct_call"],
      appointment_provider_type: ["doctor", "hospital", "clinic"],
      appointment_status: [
        "pending",
        "confirmed",
        "today",
        "completed",
        "cancelled",
        "failed",
      ],
      availability_status: ["available", "busy", "away", "offline", "dnd"],
      call_status: ["initiated", "missed", "completed", "busy", "declined"],
      medicine_scan_type: ["camera", "barcode", "qr"],
      relationship_type: [
        "father",
        "mother",
        "brother",
        "sister",
        "son",
        "daughter",
        "spouse",
        "guardian",
        "doctor",
        "other",
      ],
      reminder_channel: ["in_app", "sms"],
      report_status: ["uploading", "processing", "complete", "failed"],
    },
  },
} as const
