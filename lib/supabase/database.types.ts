/**
 * Kiểu TypeScript khớp schema Supabase (`supabase/migrations/20260703083820_xgold_schema.sql`),
 * viết tay — chưa chạy được `supabase gen types typescript` (cần project Supabase thật/local
 * Docker, không có trong sandbox này). Khi có project thật, sinh lại bằng CLI và đối chiếu.
 *
 * `Relationships: []`/`Views`/`Functions` là các trường BẮT BUỘC theo kiểu `GenericSchema` của
 * `@supabase/postgrest-js` (không tự suy luận được nếu thiếu — bản thân client sẽ ngầm rơi về
 * kiểu `never` cho mọi bảng, lỗi rất khó đọc) — đã xác nhận bằng cách đọc `.d.mts` thật của gói
 * đã cài, không đoán.
 */
export interface Database {
  public: {
    Tables: {
      instruments: {
        Row: {
          id: string;
          symbol: string;
          name: string;
          type: string;
          currency: string;
          source_config: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          name: string;
          type?: string;
          currency?: string;
          source_config?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['instruments']['Insert']>;
        Relationships: [];
      };
      candles: {
        Row: {
          instrument_id: string;
          timeframe: string;
          ts: string;
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number | null;
          source: string;
          created_at: string;
        };
        Insert: {
          instrument_id: string;
          timeframe: string;
          ts: string;
          open: number;
          high: number;
          low: number;
          close: number;
          volume?: number | null;
          source: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['candles']['Insert']>;
        Relationships: [];
      };
      ingest_runs: {
        Row: {
          id: string;
          instrument_id: string;
          provider: string;
          timeframe: string;
          started_at: string;
          finished_at: string | null;
          status: string;
          rows_upserted: number;
          error: string | null;
        };
        Insert: {
          id?: string;
          instrument_id: string;
          provider: string;
          timeframe: string;
          started_at?: string;
          finished_at?: string | null;
          status?: string;
          rows_upserted?: number;
          error?: string | null;
        };
        Update: Partial<Database['public']['Tables']['ingest_runs']['Insert']>;
        Relationships: [];
      };
      domestic_gold_prices: {
        Row: {
          vendor: string;
          product: string;
          buy: number;
          sell: number;
          ts: string;
          source: string;
          created_at: string;
        };
        Insert: {
          vendor: string;
          product: string;
          buy: number;
          sell: number;
          ts: string;
          source: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['domestic_gold_prices']['Insert']>;
        Relationships: [];
      };
      domestic_gold_ingest_runs: {
        Row: {
          id: string;
          vendor: string;
          provider: string;
          started_at: string;
          finished_at: string | null;
          status: string;
          rows_upserted: number;
          error: string | null;
        };
        Insert: {
          id?: string;
          vendor: string;
          provider: string;
          started_at?: string;
          finished_at?: string | null;
          status?: string;
          rows_upserted?: number;
          error?: string | null;
        };
        Update: Partial<Database['public']['Tables']['domestic_gold_ingest_runs']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
