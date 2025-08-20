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
    const { authToken, itemNumber } = await req.json();

    if (!authToken || !itemNumber) {
      console.error('Missing required parameters:', { authToken: !!authToken, itemNumber: !!itemNumber });
      return new Response(
        JSON.stringify({ error: 'Missing authToken or itemNumber (SKU)' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Fetching inventory properties for SKU: ${itemNumber}`);

    const response = await fetch('https://eu-ext.linnworks.net/api/Inventory/GetInventoryItemExtendedProperties', {
      method: 'POST',
      headers: {
        'Authorization': authToken,
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        itemNumber: itemNumber
      }),
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
    console.log(`Successfully fetched inventory properties for ${itemNumber}`);

    // Extract specific properties we need
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

    if (Array.isArray(data)) {
      for (const property of data) {
        if (property.ProperyName === "Z-Cost £ / Account Only") {
          costGBP = property.PropertyValue;
        } else if (property.ProperyName === "Z-Shipping Freight / Account Only") {
          shippingFreight = property.PropertyValue;
        } else if (property.ProperyName === "Z-Courier Charge / Account Only") {
          courierCharge = property.PropertyValue;
        } else if (property.ProperyName === "Z-Amazon Fee") {
          amazonFee = property.PropertyValue;
        } else if (property.ProperyName === "Z-B&Q Fee") {
          bqFee = property.PropertyValue;
        } else if (property.ProperyName === "Z-Ebay Fee") {
          ebayFee = property.PropertyValue;
        } else if (property.ProperyName === "Z-Debenhams Fee") {
          debenhamsFee = property.PropertyValue;
        } else if (property.ProperyName === "Z-Manomano Fee") {
          manomanoFee = property.PropertyValue;
        } else if (property.ProperyName === "Z-Onbuy Fee") {
          onbuyFee = property.PropertyValue;
        } else if (property.ProperyName === "Z-Shein Fee") {
          sheinFee = property.PropertyValue;
        } else if (property.ProperyName === "Z-Shopify Fee") {
          shopifyFee = property.PropertyValue;
        } else if (property.ProperyName === "Z-Tesco Fee") {
          tescoFee = property.PropertyValue;
        } else if (property.ProperyName === "Z-TheRange Fee") {
          theRangeFee = property.PropertyValue;
        } else if (property.ProperyName === "Z-Tiktok Fee") {
          tiktokFee = property.PropertyValue;
        } else if (property.ProperyName === "Z-Robert Dyas Fee") {
          robertDyasFee = property.PropertyValue;
        } else if (property.ProperyName === "Z-Wayfair Fee") {
          wayfairFee = property.PropertyValue;
        } else if (property.ProperyName === "Z-Wilko Fee") {
          wilkoFee = property.PropertyValue;
        } else if (property.ProperyName === "Z-Groupon Fee") {
          grouponFee = property.PropertyValue;
        } else if (property.ProperyName === "Z-Groupon Price") {
          grouponPrice = property.PropertyValue;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        sku: itemNumber,
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
        hasData: costGBP !== null || shippingFreight !== null || courierCharge !== null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in linnworks-inventory-properties function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});