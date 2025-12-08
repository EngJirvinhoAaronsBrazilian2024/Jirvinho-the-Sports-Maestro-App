import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msgesbypqxghbqfkkufc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZ2VzYnlwcXhnaGJxZmtrdWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTQxNzIsImV4cCI6MjA4MDc3MDE3Mn0.Ylfd9vZtCUxGmqyiSKFTI_73sTW_zXG_8R7JjBHrX2E';

export const supabase = createClient(supabaseUrl, supabaseKey);