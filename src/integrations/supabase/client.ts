import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cwuwhlwozhajjzsmqyzc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3dXdobHdvemhhamp6c21xeXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDg0MjAsImV4cCI6MjA4MDUyNDQyMH0.c_PKMTkxBv5se8RjCtLYGPB6bAqTwq8_OH97xglTGug'

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Import the supabase client like this:
// For React:
// import { supabase } from "@/integrations/supabase/client";
// For React Native:
// import { supabase } from "@/src/integrations/supabase/client";
