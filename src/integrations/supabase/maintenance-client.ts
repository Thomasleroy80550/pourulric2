import { createClient } from "@supabase/supabase-js";

export const maintenanceClient = createClient(
  "https://dkjaejzwmmwwzhokpbgs.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRramFlanp3bW13d3pob2twYmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MTQwMjAsImV4cCI6MjA2NDk5MDAyMH0.aTOtiL49-BYCyO4K3Bek37i5XQD3fWzim59j9fEMtJs",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "hello-keys-maintenance-public",
    },
  },
);
