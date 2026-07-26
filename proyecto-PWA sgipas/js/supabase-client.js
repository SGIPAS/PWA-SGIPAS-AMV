// Importación directa (ESM) para evitar errores de carga asíncrona
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://dhxeyusfpuwzpksxmguo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoeGV5dXNmcHV3enBrc3htZ3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NTIyOTgsImV4cCI6MjA5OTAyODI5OH0.zi--IZhQRMBuUx3ZSghDrkmvXUhcmIZ6VbbTKAWPN5I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);