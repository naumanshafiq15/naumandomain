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

          console.log(`Order items response status for ${orderId}:`, orderItemsResponse.status);

          if (!orderItemsResponse.ok) {
            console.error(`Failed to fetch order items for ${orderId}:`, {
              status: orderItemsResponse.status,
              statusText: orderItemsResponse.statusText,
              headers: Object.fromEntries(orderItemsResponse.headers)
            });
            throw new Error(`Order items API error: ${orderItemsResponse.status}`);
          }

          const orderItemsData = await orderItemsResponse.json();
          console.log(`Order items data structure for ${orderId}:`, JSON.stringify(orderItemsData, null, 2));
          
          
          // Extract SKU from the response - handle different possible structures
          let sku = null;
          
          if (Array.isArray(orderItemsData) && orderItemsData.length > 0) {
            // If it's an array, get SKU from first item
            sku = orderItemsData[0]?.SKU || orderItemsData[0]?.ItemNumber || orderItemsData[0]?.sku;
          } else if (orderItemsData && typeof orderItemsData === 'object') {
            // If it's an object, look for SKU in various possible locations
            sku = orderItemsData.SKU || orderItemsData.ItemNumber || orderItemsData.sku ||
                  (orderItemsData.Items && orderItemsData.Items[0]?.SKU) ||
                  (orderItemsData.Data && orderItemsData.Data[0]?.SKU);
          }

          if (!sku) {
            console.error(`No SKU found for order ${orderId}. Available data:`, {
              isArray: Array.isArray(orderItemsData),
              dataType: typeof orderItemsData,
              keys: orderItemsData && typeof orderItemsData === 'object' ? Object.keys(orderItemsData) : 'N/A',
              firstItem: Array.isArray(orderItemsData) && orderItemsData[0] ? Object.keys(orderItemsData[0]) : 'N/A'
            });
            return {
              orderId,
              error: `No SKU found - received ${typeof orderItemsData} with keys: ${orderItemsData && typeof orderItemsData === 'object' ? Object.keys(orderItemsData).join(', ') : 'N/A'}`,
              sku: null,
              orderQty: null,
              costGBP: null,
              shippingFreight: null,
              courierCharge: null
            };
          }
          
          console.log(`Found SKU for ${orderId}: ${sku}`);

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

          // Extract cost, shipping data, and marketplace fees
          let costGBP = null;
          let shippingFreight = null;
          let courierCharge = null;
          let amazonFee = null;
          let bqFee = null;
          let ebayFee = null;
          let debenhamsFee = null;
          let manomanoFee = null;
          let onbuyFee = null;
          let sheinFee = null;
          let shopifyFee = null;
          let tescoFee = null;
          let theRangeFee = null;
          let tiktokFee = null;
          let robertDyasFee = null;
          let wayfairFee = null;
          let wilkoFee = null;
          let grouponFee = null;
          let grouponPrice = null;

          if (Array.isArray(inventoryData)) {
            for (const property of inventoryData) {
              const propName = property.ProperyName;
              const propValue = property.PropertyValue;
              
              if (propName === "Z-Cost-Pound") {
                costGBP = propValue;
              } else if (propName === "Z-Shipping Freight / Account Only") {
                shippingFreight = propValue;
              } else if (propName === "Z-Courier Charge / Account Only") {
                courierCharge = propValue;
              } else if (propName === "Z-Amazon Fee") {
                amazonFee = propValue;
              } else if (propName === "Z-B&Q Fee") {
                bqFee = propValue;
              } else if (propName === "Z-Ebay Fee") {
                ebayFee = propValue;
              } else if (propName === "Z-Debenhams Fee") {
                debenhamsFee = propValue;
              } else if (propName === "Z-Manomano Fee") {
                manomanoFee = propValue;
              } else if (propName === "Z-Onbuy Fee") {
                onbuyFee = propValue;
              } else if (propName === "Z-Shein Fee") {
                sheinFee = propValue;
              } else if (propName === "Z-Shopify Fee") {
                shopifyFee = propValue;
              } else if (propName === "Z-Tesco Fee") {
                tescoFee = propValue;
              } else if (propName === "Z-TheRange Fee") {
                theRangeFee = propValue;
              } else if (propName === "Z-Tiktok Fee") {
                tiktokFee = propValue;
              } else if (propName === "Z-Robert Dyas Fee") {
                robertDyasFee = propValue;
              } else if (propName === "Z-Wayfair Fee") {
                wayfairFee = propValue;
              } else if (propName === "Z-Wilko Fee") {
                wilkoFee = propValue;
              } else if (propName === "Z-Groupon Fee") {
                grouponFee = propValue;
              } else if (propName === "Z-Groupon Price") {
                grouponPrice = propValue;
              }
            }
          }

          // Extract OrderQty from order items data
          let orderQty = null;
          if (Array.isArray(orderItemsData) && orderItemsData.length > 0) {
            orderQty = orderItemsData[0]?.OrderQty || null;
          } else if (orderItemsData && typeof orderItemsData === 'object') {
            orderQty = orderItemsData.OrderQty || null;
          }

          return {
            orderId,
            sku,
            orderQty,
            unitValue: orderItemsData?.UnitValue || null,
            costGBP,
            shippingFreight,
            courierCharge,
            amazonFee,
            bqFee,
            ebayFee,
            debenhamsFee,
            manomanoFee,
            onbuyFee,
            sheinFee,
            shopifyFee,
            tescoFee,
            theRangeFee,
            tiktokFee,
            robertDyasFee,
            wayfairFee,
            wilkoFee,
            grouponFee,
            grouponPrice,
            success: true
          };

        } catch (error) {
          console.error(`Error processing order ${orderId}:`, error.message);
          return {
            orderId,
            error: error.message,
            sku: null,
            orderQty: null,
            costGBP: null,
            shippingFreight: null,
            courierCharge: null
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
