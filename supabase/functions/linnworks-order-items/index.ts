import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { authToken, pkOrderId } = await req.json();

    if (!authToken || !pkOrderId) {
      console.error('Missing required parameters:', { authToken: !!authToken, pkOrderId: !!pkOrderId });
      return new Response(
        JSON.stringify({ error: 'Missing authToken or pkOrderId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Fetching order items for order: ${pkOrderId}`);

    const response = await fetch(`https://eu-ext.linnworks.net/api/ProcessedOrders/GetReturnItemsInfo?pkOrderId=${pkOrderId}`, {
      method: 'GET',
      headers: {
        'Authorization': authToken,
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Linnworks API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Linnworks API error: ${response.status}` }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log(`Successfully fetched order items for ${pkOrderId}:`, data);

    // Extract SKU from the response
    const sku = data?.SKU || null;
    
    return new Response(
      JSON.stringify({ 
        orderId: pkOrderId,
        sku,
        itemTitle: data?.ItemTitle || null,
        unitValue: data?.UnitValue || null,
        stockItemId: data?.pkStockItemId || null,
        fullData: data
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in linnworks-order-items function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});