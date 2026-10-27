export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EventStatus = "draft" | "planning" | "confirmed" | "completed" | "cancelled";
export type CollaboratorRole = "owner" | "editor" | "viewer";
export type PaymentStatus = "unpaid" | "deposit_paid" | "fully_paid";
export type VendorStatus = "inquiry" | "quoted" | "contracted" | "declined";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type TaskStatus = "pending" | "in_progress" | "completed" | "blocked";
export type RiskSeverity = "low" | "medium" | "high" | "critical";
export type DocumentType = "quote" | "invoice" | "receipt" | "contract" | "other";
export type ExtractionStatus = "pending" | "processing" | "completed" | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          event_type: string;
          description: string | null;
          event_date: string | null;
          location: string | null;
          guest_count: number;
          total_budget: number;
          currency: string;
          status: EventStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          event_type: string;
          description?: string | null;
          event_date?: string | null;
          guest_count?: number;
          total_budget?: number;
          currency?: string;
          status?: EventStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          event_type?: string;
          description?: string | null;
          event_date?: string | null;
          location?: string | null;
          guest_count?: number;
          total_budget?: number;
          currency?: string;
          status?: EventStatus;
          updated_at?: string;
        };
      };
      event_collaborators: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          role: CollaboratorRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          role?: CollaboratorRole;
          created_at?: string;
        };
        Update: {
          role?: CollaboratorRole;
        };
      };
      event_preferences: {
        Row: {
          id: string;
          event_id: string;
          style_preferences: Json;
          priorities: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          style_preferences?: Json;
          priorities?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          style_preferences?: Json;
          priorities?: Json;
          updated_at?: string;
        };
      };
      budget_categories: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          allocated_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          allocated_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          allocated_amount?: number;
          updated_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          event_id: string;
          category_id: string | null;
          title: string;
          estimated_amount: number;
          actual_amount: number;
          deposit_paid: number;
          due_date: string | null;
          payment_status: PaymentStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          category_id?: string | null;
          title: string;
          estimated_amount?: number;
          actual_amount?: number;
          deposit_paid?: number;
          due_date?: string | null;
          payment_status?: PaymentStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          title?: string;
          estimated_amount?: number;
          actual_amount?: number;
          deposit_paid?: number;
          due_date?: string | null;
          payment_status?: PaymentStatus;
          notes?: string | null;
          updated_at?: string;
        };
      };
      vendors: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          category: string;
          contact_email: string | null;
          contact_phone: string | null;
          quoted_amount: number | null;
          status: VendorStatus;
          contract_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          category: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          quoted_amount?: number | null;
          status?: VendorStatus;
          contract_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          category?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          quoted_amount?: number | null;
          status?: VendorStatus;
          contract_url?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      timeline_tasks: {
        Row: {
          id: string;
          event_id: string;
          title: string;
          description: string | null;
          due_date: string | null;
          priority: TaskPriority;
          status: TaskStatus;
          assignee: string | null;
          category: string | null;
          estimated_duration_hours: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          title: string;
          description?: string | null;
          due_date?: string | null;
          priority?: TaskPriority;
          status?: TaskStatus;
          assignee?: string | null;
          category?: string | null;
          estimated_duration_hours?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          due_date?: string | null;
          priority?: TaskPriority;
          status?: TaskStatus;
          assignee?: string | null;
          category?: string | null;
          estimated_duration_hours?: number | null;
          updated_at?: string;
        };
      };
      task_dependencies: {
        Row: {
          id: string;
          task_id: string;
          depends_on_task_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          depends_on_task_id: string;
          created_at?: string;
        };
        Update: {
          task_id?: string;
          depends_on_task_id?: string;
        };
      };
      theme_concepts: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          description: string;
          color_palette: Json;
          decor_direction: string | null;
          lighting_styling: string | null;
          floral_ideas: string | null;
          invitation_direction: string | null;
          moodboard_urls: Json;
          is_selected: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          description: string;
          color_palette?: Json;
          decor_direction?: string | null;
          lighting_styling?: string | null;
          floral_ideas?: string | null;
          invitation_direction?: string | null;
          moodboard_urls?: Json;
          is_selected?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          color_palette?: Json;
          decor_direction?: string | null;
          lighting_styling?: string | null;
          floral_ideas?: string | null;
          invitation_direction?: string | null;
          moodboard_urls?: Json;
          is_selected?: boolean;
        };
      };
      risk_assessments: {
        Row: {
          id: string;
          event_id: string;
          title: string;
          severity: RiskSeverity;
          category: string;
          explanation: string;
          supporting_facts: Json;
          mitigation_action: string;
          is_resolved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          title: string;
          severity: RiskSeverity;
          category: string;
          explanation: string;
          supporting_facts?: Json;
          mitigation_action: string;
          is_resolved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          severity?: RiskSeverity;
          category?: string;
          explanation?: string;
          supporting_facts?: Json;
          mitigation_action?: string;
          is_resolved?: boolean;
          updated_at?: string;
        };
      };
      uploaded_documents: {
        Row: {
          id: string;
          event_id: string;
          file_name: string;
          file_url: string;
          file_size_bytes: number;
          mime_type: string;
          document_type: DocumentType;
          extraction_status: ExtractionStatus;
          extracted_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          file_name: string;
          file_url: string;
          file_size_bytes: number;
          mime_type: string;
          document_type: DocumentType;
          extraction_status?: ExtractionStatus;
          extracted_data?: Json;
          created_at?: string;
        };
        Update: {
          file_name?: string;
          file_url?: string;
          file_size_bytes?: number;
          mime_type?: string;
          document_type?: DocumentType;
          extraction_status?: ExtractionStatus;
          extracted_data?: Json;
        };
      };
    };
  };
}
