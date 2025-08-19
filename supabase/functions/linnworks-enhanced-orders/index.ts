import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { authToken, orderIds } = await req.json();

    if (!authToken || !Array.isArray(orderIds)) {
      console.error('Missing required parameters:', { authToken: !!authToken, orderIds: Array.isArray(orderIds) });
      return new Response(
        JSON.stringify({ error: 'Missing authToken or orderIds array' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing enhanced data for ${orderIds.length} orders`);

    const results = [];
    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES = 1000; // 1 second
    const DELAY_BETWEEN_CALLS = 200; // 200ms

    for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
      const batch = orderIds.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}, orders: ${batch.join(', ')}`);

      const batchPromises = batch.map(async (orderId: string, index: number) => {
        try {
          // Add delay between individual calls within batch
          if (index > 0) {
            await delay(DELAY_BETWEEN_CALLS);
          }

          // Step 1: Get SKU from order items
          console.log(`Fetching order items for: ${orderId}`);
          const orderItemsResponse = await fetch(`https://eu-ext.linnworks.net/api/ProcessedOrders/GetReturnItemsInfo?pkOrderId=${orderId}`, {
            method: 'GET',
            headers: {
              'Authorization': authToken,
              'accept': 'application/json',
            },
          });

          if (!orderItemsResponse.ok) {
            throw new Error(`Order items API error: ${orderItemsResponse.status}`);
          }

          const orderItemsData = await orderItemsResponse.json();
          const sku = orderItemsData?.SKU;

          if (!sku) {
            return {
              orderId,
              error: 'No SKU found for order',
              sku: null,
              costGBP: null,
              shippingFreight: null
            };
          }

          // Small delay before next API call
          await delay(DELAY_BETWEEN_CALLS);

          // Step 2: Get inventory properties using SKU
          console.log(`Fetching inventory properties for SKU: ${sku}`);
          const inventoryResponse = await fetch('https://eu-ext.linnworks.net/api/Inventory/GetInventoryItemExtendedProperties', {
            method: 'POST',
            headers: {
              'Authorization': authToken,
              'accept': 'application/json',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              itemNumber: sku
            }),
          });

          if (!inventoryResponse.ok) {
            throw new Error(`Inventory API error: ${inventoryResponse.status}`);
          }

          const inventoryData = await inventoryResponse.json();

          // Extract cost and shipping data
          let costGBP = null;
          let shippingFreight = null;

          if (Array.isArray(inventoryData)) {
            for (const property of inventoryData) {
              if (property.ProperyName === "Z-Cost £ / Account Only") {
                costGBP = property.PropertyValue;
              } else if (property.ProperyName === "Z-Shipping Freight / Account Only") {
                shippingFreight = property.PropertyValue;
              }
            }
          }

          return {
            orderId,
            sku,
            itemTitle: orderItemsData?.ItemTitle || null,
            unitValue: orderItemsData?.UnitValue || null,
            costGBP,
            shippingFreight,
            success: true
          };

        } catch (error) {
          console.error(`Error processing order ${orderId}:`, error.message);
          return {
            orderId,
            error: error.message,
            sku: null,
            costGBP: null,
            shippingFreight: null
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Delay between batches to avoid overwhelming the API
      if (i + BATCH_SIZE < orderIds.length) {
        console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }

    console.log(`Successfully processed enhanced data for ${results.length} orders`);

    return new Response(
      JSON.stringify({ 
        results,
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => r.error).length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in linnworks-enhanced-orders function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});