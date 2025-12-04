import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jsljrnnrdjpfizcpuqpj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbGpybm5yZGpwZml6Y3B1cXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjI5MDgsImV4cCI6MjA4MDM5ODkwOH0.E0YO0qpedu7cYZw0YWhYmB8s6YYpI502ad51-VH4A28';

export const supabase = createClient(supabaseUrl, supabaseKey);