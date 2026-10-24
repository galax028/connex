
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "faculties": {
                  Row: {
                    "code": string,"created_at": string,"id": number,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"id"?: never,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"id"?: never,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"parties": {
                  Row: {
                    "approval_required": boolean,"category_id": string | null,"created_at": string,"description": string | null,"estimated_cost": number | null,"id": string,"location": string | null,"location_coordinates": unknown,"location_description": string | null,"max_slots": number | null,"name": string,"organiser_id": string,"taken_slots": number | null,"time_end": string | null,"time_start": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approval_required"?: boolean,"category_id"?: string | null,"created_at"?: string,"description"?: string | null,"estimated_cost"?: number | null,"id"?: string,"location"?: string | null,"location_coordinates"?: unknown,"location_description"?: string | null,"max_slots"?: number | null,"name": string,"organiser_id": string,"taken_slots"?: number | null,"time_end"?: string | null,"time_start": string,"updated_at"?: string
                  }
                  Update: {
                    "approval_required"?: boolean,"category_id"?: string | null,"created_at"?: string,"description"?: string | null,"estimated_cost"?: number | null,"id"?: string,"location"?: string | null,"location_coordinates"?: unknown,"location_description"?: string | null,"max_slots"?: number | null,"name"?: string,"organiser_id"?: string,"taken_slots"?: number | null,"time_end"?: string | null,"time_start"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "parties_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "party_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parties_organiser_id_fkey"
      columns: ["organiser_id"]
isOneToOne: false
      referencedRelation: "user_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"parties_tags": {
                  Row: {
                    "created_at": string,"party_id": string,"tag_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"party_id": string,"tag_id": string
                  }
                  Update: {
                    "created_at"?: string,"party_id"?: string,"tag_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "parties_tags_party_id_fkey"
      columns: ["party_id"]
isOneToOne: false
      referencedRelation: "parties"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parties_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id"]
    }
                  ]
                },"parties_users": {
                  Row: {
                    "created_at": string,"party_id": string,"status": Database["public"]['Enums']["approval_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"party_id": string,"status"?: Database["public"]['Enums']["approval_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"party_id"?: string,"status"?: Database["public"]['Enums']["approval_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "parties_users_party_id_fkey"
      columns: ["party_id"]
isOneToOne: false
      referencedRelation: "parties"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parties_users_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "user_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"party_categories": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"party_chat_messages": {
                  Row: {
                    "content": string,"created_at": string,"id": string,"party_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"id"?: string,"party_id": string,"user_id": string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"id"?: string,"party_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "party_chat_messages_party_id_fkey"
      columns: ["party_id"]
isOneToOne: false
      referencedRelation: "parties"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "party_chat_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "user_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tags": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_profiles": {
                  Row: {
                    "biography": string | null,"created_at": string,"enrolment_year": number | null,"faculty_code": string | null,"fullname": string,"id": string,"nickname": string | null,"profile_url": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "biography"?: string | null,"created_at"?: string,"enrolment_year"?: number | null,"faculty_code"?: string | null,"fullname": string,"id": string,"nickname"?: string | null,"profile_url": string,"updated_at"?: string
                  }
                  Update: {
                    "biography"?: string | null,"created_at"?: string,"enrolment_year"?: number | null,"faculty_code"?: string | null,"fullname"?: string,"id"?: string,"nickname"?: string | null,"profile_url"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_profiles_faculty_code_fkey"
      columns: ["faculty_code"]
isOneToOne: false
      referencedRelation: "faculties"
      referencedColumns: ["code"]
    }
                  ]
                },"users_tags": {
                  Row: {
                    "created_at": string,"tag_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"tag_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"tag_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "users_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "users_tags_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "user_profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "show_limit":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"show_trgm":
{ Args: { "": string }; Returns: (string)[]
                           }
          }
          Enums: {
            "approval_status": "pending"|"approved"|"declined"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "approval_status": ["pending", "approved", "declined"]
          }
        }
} as const
