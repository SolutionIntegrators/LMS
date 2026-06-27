export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'user' | 'admin'
          created_at: string
          last_login_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'user' | 'admin'
          created_at?: string
          last_login_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'user' | 'admin'
          created_at?: string
          last_login_at?: string | null
        }
      }
      products: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          cover_image_url: string | null
          is_active: boolean
          thrivecart_product_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          cover_image_url?: string | null
          is_active?: boolean
          thrivecart_product_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          cover_image_url?: string | null
          is_active?: boolean
          thrivecart_product_id?: string | null
          created_at?: string
        }
      }
      modules: {
        Row: {
          id: string
          product_id: string
          title: string
          description: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          title: string
          description?: string | null
          sort_order: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          title?: string
          description?: string | null
          sort_order?: number
          created_at?: string
        }
      }
      lessons: {
        Row: {
          id: string
          module_id: string
          title: string
          description: string | null
          content_type: 'video' | 'pdf' | 'download' | 'text' | 'embed' | null
          content_url: string | null
          sort_order: number
          is_preview: boolean
          created_at: string
        }
        Insert: {
          id?: string
          module_id: string
          title: string
          description?: string | null
          content_type?: 'video' | 'pdf' | 'download' | 'text' | 'embed' | null
          content_url?: string | null
          sort_order: number
          is_preview?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          module_id?: string
          title?: string
          description?: string | null
          content_type?: 'video' | 'pdf' | 'download' | 'text' | 'embed' | null
          content_url?: string | null
          sort_order?: number
          is_preview?: boolean
          created_at?: string
        }
      }
      user_product_access: {
        Row: {
          id: string
          user_id: string
          product_id: string
          granted_at: string
          granted_by: string | null
          transaction_ref: string | null
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          granted_at?: string
          granted_by?: string | null
          transaction_ref?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          granted_at?: string
          granted_by?: string | null
          transaction_ref?: string | null
        }
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          event_type: string
          product_id: string | null
          module_id: string | null
          lesson_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          product_id?: string | null
          module_id?: string | null
          lesson_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          product_id?: string | null
          module_id?: string | null
          lesson_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      lesson_completions: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          completed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id: string
          completed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lesson_id?: string
          completed_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
