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

    console.log('=== LINNWORKS AUTH DEBUG ===');
    console.log('ApplicationId exists:', !!applicationId);
    console.log('ApplicationSecret exists:', !!applicationSecret);
    console.log('Token exists:', !!token);
    
    if (applicationId) console.log('ApplicationId length:', applicationId.length);
    if (applicationSecret) console.log('ApplicationSecret length:', applicationSecret.length);
    if (token) console.log('Token length:', token.length);

    if (!applicationId || !applicationSecret || !token) {
      const missing = [];
      if (!applicationId) missing.push('LINNWORKS_APPLICATION_ID');
      if (!applicationSecret) missing.push('LINNWORKS_APPLICATION_SECRET');
      if (!token) missing.push('LINNWORKS_TOKEN');
      throw new Error(`Missing Linnworks credentials: ${missing.join(', ')}`);
    }

    const requestBody = {
      applicationId: applicationId,
      applicationSecret: applicationSecret,
      token: token
    };
    
    console.log('Making auth request to Linnworks API...');
    
    const authResponse = await fetch('https://api.linnworks.net/api/Auth/AuthorizeByApplication', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Auth response status:', authResponse.status);
    console.log('Auth response headers:', Object.fromEntries(authResponse.headers));
    
    const responseText = await authResponse.text();
    console.log('Auth response body length:', responseText.length);
    console.log('Auth response body:', responseText);

    if (!authResponse.ok) {
      console.error('Authentication failed with details:', {
        status: authResponse.status,
        statusText: authResponse.statusText,
        headers: Object.fromEntries(authResponse.headers),
        body: responseText
      });
      throw new Error(`Authentication failed: ${authResponse.status} - ${responseText}`);
    }

    const authData = JSON.parse(responseText);
    console.log('Authentication successful, returning token:', authData.Token);

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