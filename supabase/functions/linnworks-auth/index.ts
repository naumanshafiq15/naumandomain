import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const applicationId = Deno.env.get('LINNWORKS_APPLICATION_ID');
    const applicationSecret = Deno.env.get('LINNWORKS_APPLICATION_SECRET');
    const token = Deno.env.get('LINNWORKS_TOKEN');

    if (!applicationId || !applicationSecret || !token) {
      throw new Error('Missing Linnworks credentials');
    }

    console.log('Making auth request with credentials...');
    
    const authResponse = await fetch('https://eu-ext.linnworks.net/api/Auth/AuthorizeByApplication', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ApplicationId: applicationId,
        ApplicationSecret: applicationSecret,
        Token: token
      }),
    });

    console.log('Auth response status:', authResponse.status);
    const responseText = await authResponse.text();
    console.log('Auth response body:', responseText);

    if (!authResponse.ok) {
      throw new Error(`Authentication failed: ${authResponse.status} - ${responseText}`);
    }

    const authData = JSON.parse(responseText);
    console.log('Authentication successful:', authData);

    return new Response(JSON.stringify({ token: authData.Token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in linnworks-auth function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});