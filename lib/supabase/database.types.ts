export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type AnyRow = Record<string, unknown>;

export type Database = {
  public: {
    Tables: {
      audit_log: Table<{
        id: string;
        entity_type: string;
        entity_id: string;
        action: string;
        changed_by: string | null;
        changed_at: string;
        before: Json | null;
        after: Json | null;
      }, {
        id?: string;
        entity_type: string;
        entity_id: string;
        action: string;
        changed_by?: string | null;
        changed_at?: string;
        before?: Json | null;
        after?: Json | null;
      }>;
      deck_images: Table<{
        id: string;
        draft_event_id: string;
        draft_participant_id: string;
        uploaded_by: string | null;
        storage_path: string;
        file_name: string;
        mime_type: string;
        file_size_bytes: number;
        caption: string | null;
        created_at: string;
        updated_by: string | null;
        updated_at: string;
      }, {
        id?: string;
        draft_event_id: string;
        draft_participant_id: string;
        uploaded_by?: string | null;
        storage_path: string;
        file_name: string;
        mime_type: string;
        file_size_bytes: number;
        caption?: string | null;
        created_at?: string;
        updated_by?: string | null;
        updated_at?: string;
      }>;
      draft_events: Table<AnyRow>;
      draft_participants: Table<AnyRow>;
      cubeathon_events: Table<AnyRow>;
      cubeathon_results: Table<AnyRow>;
      matches: Table<AnyRow>;
      match_results: Table<AnyRow>;
      money_results: Table<AnyRow>;
      sidebets: Table<AnyRow>;
      users: Table<AnyRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
