import { supabase } from "@/integrations/supabase/client";

const GSHEET_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/gsheet-proxy";

interface GSheetReadParams {
  action: 'read_sheet';
  range?: string; // e.g., 'Sheet1!A1:Z100'
}

interface GSheetWriteParams {
  action: 'write_sheet';
  range: string; // e.g., 'Sheet1!A1'
  values: any[][]; // Array of arrays for rows and columns
}

type GSheetActionParams = GSheetReadParams | GSheetWriteParams;

export async function callGSheetProxy(params: GSheetActionParams): Promise<any> {
  try {
    console.log(`Calling GSheet proxy with action: ${params.action}`);

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error getting Supabase session for GSheet proxy:", sessionError);
      throw new Error("Could not retrieve Supabase session for authorization.");
    }

    if (!session) {
      console.warn("No active Supabase session found. Cannot authorize GSheet proxy call.");
      throw new Error("User not authenticated. Please log in.");
    }

    const response = await fetch(GSHEET_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
    });

    console.log(`Response status from GSheet proxy: ${response.status}`);
    const responseData = await response.json();
    console.log(`Raw response from GSheet proxy:`, responseData);

    if (!response.ok) {
      console.error("Error from GSheet proxy:", responseData.error);
      throw new Error(`Failed to perform GSheet action: ${responseData.error || 'Unknown error'}`);
    }

    return responseData.data;

  } catch (error: any) {
    console.error("Error calling GSheet proxy:", error.message);
    throw error;
  }
}