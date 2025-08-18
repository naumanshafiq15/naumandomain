import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessedOrder {
  pkOrderID: string;
  dReceivedDate: string;
  dProcessedOn: string;
  fTotalCharge: number;
  Subtotal: number;
  fTax: number;
  ProfitMargin: number;
  Source: string;
  nOrderId: number;
}

interface MonthlyProfitData {
  month: string;
  year: number;
  ordersNumber: number;
  ordersValue: number;
  profit: number;
  profitPercent: number;
}

interface SourceProfitData {
  source: string;
  monthlyData: MonthlyProfitData[];
  totalOrders: number;
  totalValue: number;
  totalProfit: number;
  averageProfitPercent: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { authToken, fromDate, toDate } = await req.json();
    
    if (!authToken) {
      return new Response(
        JSON.stringify({ error: 'Auth token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching processed orders for profit calculation...');

    // Fetch processed orders from Linnworks API
    const requestBody = {
      request: {
        SearchFilters: [],
        PageNumber: 1,
        ResultsPerPage: 1000, // Get more data for comprehensive analysis
        FromDate: fromDate || "2024-01-01T00:00:00",
        DateField: "processed",
        ToDate: toDate || "2025-12-31T23:59:59"
      }
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://eu-ext.linnworks.net/api/ProcessedOrders/SearchProcessedOrders', {
      method: 'POST',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Linnworks API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Successfully fetched orders for profit calculation');

    const orders: ProcessedOrder[] = data.ProcessedOrders?.Data || [];
    
    if (orders.length === 0) {
      return new Response(
        JSON.stringify({ profitData: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process data by source and month
    const sourceMap = new Map<string, Map<string, {
      ordersNumber: number;
      ordersValue: number;
      profit: number;
      year: number;
      month: string;
    }>>();

    orders.forEach(order => {
      const processedDate = new Date(order.dProcessedOn);
      const year = processedDate.getFullYear();
      const month = processedDate.toLocaleString('en-US', { month: 'long' });
      const monthKey = `${year}-${month}`;
      
      const source = order.Source || 'Unknown';
      const orderValue = order.Subtotal || 0;
      const profit = order.ProfitMargin || 0;

      if (!sourceMap.has(source)) {
        sourceMap.set(source, new Map());
      }

      const sourceMonths = sourceMap.get(source)!;
      
      if (!sourceMonths.has(monthKey)) {
        sourceMonths.set(monthKey, {
          ordersNumber: 0,
          ordersValue: 0,
          profit: 0,
          year,
          month
        });
      }

      const monthData = sourceMonths.get(monthKey)!;
      monthData.ordersNumber += 1;
      monthData.ordersValue += orderValue;
      monthData.profit += profit;
    });

    // Convert to final format
    const profitData: SourceProfitData[] = [];

    sourceMap.forEach((sourceMonths, source) => {
      const monthlyData: MonthlyProfitData[] = [];
      let totalOrders = 0;
      let totalValue = 0;
      let totalProfit = 0;

      sourceMonths.forEach((data, monthKey) => {
        const profitPercent = data.ordersValue > 0 ? (data.profit / data.ordersValue) * 100 : 0;
        
        monthlyData.push({
          month: data.month,
          year: data.year,
          ordersNumber: data.ordersNumber,
          ordersValue: data.ordersValue,
          profit: data.profit,
          profitPercent
        });

        totalOrders += data.ordersNumber;
        totalValue += data.ordersValue;
        totalProfit += data.profit;
      });

      // Sort monthly data by year and month
      monthlyData.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      });

      const averageProfitPercent = totalValue > 0 ? (totalProfit / totalValue) * 100 : 0;

      profitData.push({
        source,
        monthlyData,
        totalOrders,
        totalValue,
        totalProfit,
        averageProfitPercent
      });
    });

    // Sort by total value (highest first)
    profitData.sort((a, b) => b.totalValue - a.totalValue);

    console.log(`Processed profit data for ${profitData.length} sources`);

    return new Response(
      JSON.stringify({ profitData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in linnworks-profit-calculator:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});