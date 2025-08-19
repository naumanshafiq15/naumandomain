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
    const { authToken, searchFilters, pageNumber = 1, resultsPerPage = 200, fromDate, toDate } = await req.json();

    if (!authToken) {
      throw new Error('Authorization token is required');
    }

    // Map certain search terms to use SubSource field instead of Source
    const mappedSearchFilters = searchFilters?.map((filter: any) => {
      if (filter.SearchField === "Source" && (filter.SearchTerm === "Wilko" || filter.SearchTerm === "RobertDayas")) {
        return {
          SearchField: "SubSource",
          SearchTerm: filter.SearchTerm
        };
      }
      return filter;
    }) || [
      {
        SearchField: "Source",
        SearchTerm: "DIRECT"
      }
    ];

    const requestBody = {
      request: {
        SearchFilters: mappedSearchFilters,
        PageNumber: pageNumber,
        ResultsPerPage: resultsPerPage,
        FromDate: fromDate || "2025-05-01T00:00:00",
        DateField: "processed",
        ToDate: toDate || "2025-09-01T00:00:00"
      }
    };

    console.log('Making request to Linnworks API with token:', authToken);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://eu-ext.linnworks.net/api/ProcessedOrders/SearchProcessedOrders', {
      method: 'POST',
      headers: {
        'Authorization': authToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API response error:', response.status, errorText);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Successfully fetched processed orders:', data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in linnworks-processed-orders function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});