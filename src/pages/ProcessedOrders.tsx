import { useState, useEffect } from "react";
import { useLinnworksAuth } from "@/hooks/use-linnworks-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CalendarIcon, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ProcessedOrder {
  pkOrderID: string;
  nOrderId: number;
  dReceivedDate: string;
  dProcessedOn: string;
  timeDiff: number;
  fPostageCost: number;
  fTotalCharge: number;
  PostageCostExTax: number;
  Subtotal: number;
  fTax: number;
  TotalDiscount: number;
  ProfitMargin: number;
  cCurrency: string;
  PostalTrackingNumber: string;
  cCountry: string;
  Source: string;
  SubSource?: string;
  PostalServiceName: string;
  ReferenceNum: string;
  Address1: string;
  Town: string;
  BuyerPhoneNumber: string;
  cFullName: string;
  cEmailAddress: string;
  cPostCode: string;
  AccountName: string;
  // Enhanced data
  sku?: string;
  orderQty?: number;
  itemTitle?: string;
  unitValue?: number;
  costGBP?: string;
  shippingFreight?: string;
  courierCharge?: string;
  // Calculated fields
  marketplaceFee?: number;
  vat?: number;
  vatA?: number; // For Wayfair VATA
  totalCost?: number;
  profit?: number;
  enhancedDataLoading?: boolean;
  enhancedDataError?: string;
}

interface ProcessedOrdersResponse {
  ProcessedOrders: {
    PageNumber: number;
    EntriesPerPage: number;
    TotalEntries: number;
    TotalPages: number;
    Data: ProcessedOrder[];
  };
}

interface EnhancedOrderResult {
  orderId: string;
  sku?: string;
  orderQty?: number;
  itemTitle?: string;
  unitValue?: number;
  costGBP?: string;
  shippingFreight?: string;
  courierCharge?: string;
  amazonFee?: string;
  bqFee?: string;
  ebayFee?: string;
  debenhamsFee?: string;
  manomanoFee?: string;
  onbuyFee?: string;
  sheinFee?: string;
  shopifyFee?: string;
  tescoFee?: string;
  theRangeFee?: string;
  tiktokFee?: string;
  robertDyasFee?: string;
  wayfairFee?: string;
  wilkoFee?: string;
  grouponFee?: string;
  grouponPrice?: string;
  error?: string;
  success?: boolean;
}

export default function ProcessedOrders() {
  const {
    authToken,
    isLoading: authLoading,
    error: authError,
    authenticate
  } = useLinnworksAuth();
  const [orders, setOrders] = useState<ProcessedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [enhancedDataLoading, setEnhancedDataLoading] = useState(false);
  const [showEnhancedColumns, setShowEnhancedColumns] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    entriesPerPage: 200,
    totalEntries: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    fromDate: new Date("2025-05-01"),
    toDate: new Date("2025-09-01"),
    source: "ALL",
    subSource: "all"
  });
  const {
    toast
  } = useToast();

  // Profit calculation helper function for all sources
  const calculateProfitFields = (order: ProcessedOrder, result: EnhancedOrderResult) => {
    const sellingPriceIncVat = order.fTotalCharge || 0;
    const costGBP = parseFloat(result.costGBP || '0');
    const shippingFreight = parseFloat(result.shippingFreight || '0');
    const courierCharge = parseFloat(result.courierCharge || '0');
    
    // Debug logging to identify source mapping issues
    console.log('Order Source:', order.Source);
    console.log('Available fees in result:', {
      amazonFee: result.amazonFee,
      bqFee: result.bqFee,
      ebayFee: result.ebayFee,
      debenhamsFee: result.debenhamsFee,
      manomanoFee: result.manomanoFee,
      onbuyFee: result.onbuyFee,
      sheinFee: result.sheinFee,
      shopifyFee: result.shopifyFee,
      tescoFee: result.tescoFee,
      theRangeFee: result.theRangeFee,
      tiktokFee: result.tiktokFee,
      robertDyasFee: result.robertDyasFee,
      wayfairFee: result.wayfairFee,
      wilkoFee: result.wilkoFee,
      grouponFee: result.grouponFee,
      grouponPrice: result.grouponPrice
    });
    
    // Special handling for VIRTUALSTOCK source
    if (order.Source === 'VIRTUALSTOCK') {
      // VIRTUALSTOCK uses different formula
      // Selling Price (Excluding VAT) = Price with VAT ÷ 1.2
      const sellingPriceExVat = sellingPriceIncVat / 1.2;
      
      // Determine marketplace fee rate and type based on SubSource
      let marketplaceFeeRate = 0;
      let feeType = '';
      
      if (order.SubSource?.toLowerCase().includes('robert dyas')) {
        marketplaceFeeRate = parseFloat(result.robertDyasFee || '0');
        feeType = 'Robert Dyas';
      } else if (order.SubSource?.toLowerCase().includes('wilko')) {
        marketplaceFeeRate = parseFloat(result.wilkoFee || '0');
        feeType = 'Wilko';
      }
      
      // Calculate marketplace fee based on subsource
      let marketplaceFee = 0;
      if (order.SubSource?.toLowerCase().includes('robert dyas')) {
        // For Robert Dyas: Marketplace Fee = Selling Price (Excluding VAT) × RobertDyas Fee
        marketplaceFee = sellingPriceExVat * marketplaceFeeRate;
      } else if (order.SubSource?.toLowerCase().includes('wilko')) {
        // For Wilko: Marketplace Fee = Selling Price (Excluding VAT) × Fee Rate  
        marketplaceFee = sellingPriceExVat * marketplaceFeeRate;
      } else {
        // Default: use excluding VAT price
        marketplaceFee = sellingPriceExVat * marketplaceFeeRate;
      }
      
      // Total Cost = Cost (£) + Sea Freight + Courier Charges + Marketplace Fee (no VAT)
      const totalCost = costGBP + shippingFreight + courierCharge + marketplaceFee;
      
      // Profit = Selling Price (Excluding VAT) - Total Cost
      const profit = sellingPriceExVat - totalCost;
      
      console.log('VIRTUALSTOCK calculation:', {
        subSource: order.SubSource,
        feeType,
        sellingPriceIncVat,
        sellingPriceExVat,
        marketplaceFeeRate,
        marketplaceFee,
        totalCost,
        profit
      });
      
      return {
        sellingPriceExVat: Math.round(sellingPriceExVat * 100) / 100,
        marketplaceFee: Math.round(marketplaceFee * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        vat: 0 // No VAT in cost calculation for VIRTUALSTOCK
      };
    }

    // Special handling for WAYFAIRCHANNEL source
    if (order.Source === 'WAYFAIRCHANNEL') {
      // WAYFAIRCHANNEL uses different formula
      const itemTotal = sellingPriceIncVat; // Item Total from API
      
      // VATA = Item Total x 0.2
      const vatA = itemTotal * 0.2;
      
      // Marketplace Fee = Item total x Wayfair Fee From extended Properties
      const wayfairFeeRate = parseFloat(result.wayfairFee || '0');
      const marketplaceFee = itemTotal * wayfairFeeRate;
      
      // Wayfair Price = (Item Total - Marketplace Fee) + VATA
      const wayfairPrice = (itemTotal - marketplaceFee) + vatA;
      
      // Total Cost = Cost £ + Sea Freight (no courier charge for Wayfair)
      const totalCost = costGBP + shippingFreight;
      
      // VATB = WayFairPrice - (WayFairPrice/1.2)
      const vatB = wayfairPrice - (wayfairPrice / 1.2);
      
      // Profit = WayFairPrice – Total Cost - VATB
      const profit = wayfairPrice - totalCost - vatB;
      
      console.log('WAYFAIRCHANNEL calculation:', {
        itemTotal,
        vatA,
        wayfairFeeRate,
        marketplaceFee,
        wayfairPrice,
        totalCost,
        vatB,
        profit
      });
      
      return {
        sellingPriceExVat: Math.round((wayfairPrice / 1.2) * 100) / 100, // Price excluding VAT
        marketplaceFee: Math.round(marketplaceFee * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        vat: Math.round(vatB * 100) / 100, // VATB for display
        vatA: Math.round(vatA * 100) / 100 // VATA for Wayfair
      };
    }

    // Special handling for GROUPON source
    if (order.Source === 'GROUPON') {
      // GROUPON uses Z-Groupon Price from extended properties as selling price
      const grouponPriceValue = parseFloat(result.grouponPrice || '0');
      
      // Marketplace Fee = Selling Price × Z-Groupon Fee
      const grouponFeeRate = parseFloat(result.grouponFee || '0');
      const marketplaceFee = grouponPriceValue * grouponFeeRate;
      
      // Total Cost = Cost (£) + Sea Freight + Courier Charges + Marketplace Fee
      const totalCost = costGBP + shippingFreight + courierCharge + marketplaceFee;
      
      // Profit = Z-Groupon Price - Total Cost
      const profit = grouponPriceValue - totalCost;
      
      console.log('GROUPON calculation:', {
        grouponPriceValue,
        grouponFeeRate,
        marketplaceFee,
        totalCost,
        profit
      });
      
      return {
        sellingPriceExVat: Math.round(grouponPriceValue * 100) / 100, // Using Groupon price
        marketplaceFee: Math.round(marketplaceFee * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        vat: 0 // No VAT calculation for GROUPON
      };
    }

    // Special handling for MIRAKL MP source
    if (order.Source === 'Mirakl MP') {
      // Determine marketplace fee based on SubSource
      let marketplaceFeeRate = 0;
      let feeType = '';
      
      if (order.SubSource?.toLowerCase().includes('b&q')) {
        marketplaceFeeRate = parseFloat(result.bqFee || '0');
        feeType = 'B&Q';
      } else if (order.SubSource?.toLowerCase().includes('debenhams')) {
        marketplaceFeeRate = parseFloat(result.debenhamsFee || '0');
        feeType = 'Debenhams';
      }
      
      // Marketplace Fee = Selling Price (Inc. VAT) × Fee Rate
      const marketplaceFee = sellingPriceIncVat * marketplaceFeeRate;
      
      // VAT = Selling Price Inc. VAT - (Selling Price Inc. VAT / 1.2)
      const vat = sellingPriceIncVat - (sellingPriceIncVat / 1.2);
      
      // Total Cost = Cost (£) + Sea Freight + Courier Charges + Marketplace Fee + VAT
      const totalCost = costGBP + shippingFreight + courierCharge + marketplaceFee + vat;
      
      // Profit = Selling Price (Inc. VAT) - Total Cost
      const profit = sellingPriceIncVat - totalCost;
      
      console.log('MIRAKL MP calculation:', {
        subSource: order.SubSource,
        feeType,
        sellingPriceIncVat,
        marketplaceFeeRate,
        marketplaceFee,
        vat,
        totalCost,
        profit
      });
      
      return {
        sellingPriceExVat: Math.round((sellingPriceIncVat / 1.2) * 100) / 100,
        marketplaceFee: Math.round(marketplaceFee * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        vat: Math.round(vat * 100) / 100
      };
    }
    
    // Get the appropriate fee based on source - using exact source names from API
    let sourceFeeRate = 0;
    const sourceToFeeMap: { [key: string]: string | undefined } = {
      // Primary mappings
      'AMAZON': result.amazonFee,
      'B&Q': result.bqFee,
      'EBAY': result.ebayFee,
      'DEBENHAMS': result.debenhamsFee,
      'MANOMANO': result.manomanoFee,
      'ONBUY': result.onbuyFee,
      'SHEIN': result.sheinFee,
      'SHOPIFY': result.shopifyFee,
      'TESCO': result.tescoFee,
      'THERANGE': result.theRangeFee,
      'TIKTOK': result.tiktokFee,
      
      // Additional exact mappings from actual API responses
      'Manomano hub': result.manomanoFee,
      'Manomano HUB': result.manomanoFee,
      'OnBuy v2': result.onbuyFee,
      'TikTok': result.tiktokFee,
      'TheRange': result.theRangeFee,
      'Debenhams': result.debenhamsFee,
      'Mirakl MP': result.manomanoFee, // Mirakl MP appears to be related to Manomano
      
      // Other possible variations
      'DIRECT': result.amazonFee, // Default to Amazon fee for direct orders
      'VIRTUALSTOCK': result.amazonFee,
      'WAYFAIRCHANNEL': result.amazonFee
    };
    
    const sourceFee = sourceToFeeMap[order.Source];
    console.log('Source fee found:', sourceFee, 'for source:', order.Source);
    
    if (sourceFee) {
      sourceFeeRate = parseFloat(sourceFee) || 0;
    }
    
    // Marketplace Fee = Selling Price (Inc. VAT) × Source Fee Rate
    const marketplaceFee = sellingPriceIncVat * sourceFeeRate;
    
    // VAT = Selling Price Inc. VAT - (Selling Price Inc. VAT / 1.2)
    const vat = sellingPriceIncVat - (sellingPriceIncVat / 1.2);
    
    // Total Cost = Cost (£) + Sea Freight + Courier Charges + Marketplace Fee + VAT
    const totalCost = costGBP + shippingFreight + courierCharge + marketplaceFee + vat;
    
    // Profit = Selling Price (Inc. VAT) - Total Cost
    const profit = sellingPriceIncVat - totalCost;

    return {
      marketplaceFee: Math.round(marketplaceFee * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      profit: Math.round(profit * 100) / 100
    };
  };

  const fetchOrders = async (pageNumber = 1) => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      // Build search filters based on user input
      const searchFilters = [];
      
      // Only add source filter if not "ALL"
      if (filters.source !== "ALL") {
        searchFilters.push({
          SearchField: "Source",
          SearchTerm: filters.source
        });
      }
      
      // Add SubSource filter if specified and not "all"
      if (filters.subSource.trim() && filters.subSource !== "all") {
        searchFilters.push({
          SearchField: "SubSource",
          SearchTerm: filters.subSource
        });
      }

      const {
        data,
        error
      } = await supabase.functions.invoke('linnworks-processed-orders', {
        body: {
          authToken,
          searchFilters,
          pageNumber,
          resultsPerPage: 200,
          fromDate: `${format(filters.fromDate, "yyyy-MM-dd")}T00:00:00`,
          toDate: `${format(filters.toDate, "yyyy-MM-dd")}T00:00:00`
        }
      });
      if (error) {
        throw new Error(error.message);
      }
      const response = data as ProcessedOrdersResponse;
      if (response.ProcessedOrders) {
        setOrders(response.ProcessedOrders.Data);
        setPagination({
          pageNumber: response.ProcessedOrders.PageNumber,
          entriesPerPage: response.ProcessedOrders.EntriesPerPage,
          totalEntries: response.ProcessedOrders.TotalEntries,
          totalPages: response.ProcessedOrders.TotalPages
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch orders';
      toast({
        title: "Error fetching orders",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEnhancedDataForOrder = async (orderId: string) => {
    if (!authToken) return;

    // Mark this order as loading
    setOrders(prev => prev.map(order => order.pkOrderID === orderId ? {
      ...order,
      enhancedDataLoading: true,
      enhancedDataError: undefined
    } : order));
    try {
      const {
        data,
        error: fetchError
      } = await supabase.functions.invoke('linnworks-enhanced-orders', {
        body: {
          authToken,
          orderIds: [orderId]
        }
      });
      if (fetchError) {
        throw new Error(fetchError.message);
      }
      if (data?.results && data.results.length > 0) {
        console.log('Single order fetch response:', data);
        console.log('Looking for orderId:', orderId);
        const result = data.results.find((r: EnhancedOrderResult) => r.orderId === orderId) as EnhancedOrderResult;
        console.log('Found result:', result);
        if (result) {
          setOrders(prev => prev.map(order => order.pkOrderID === orderId ? {
            ...order,
            sku: result.sku,
            orderQty: result.orderQty,
            itemTitle: result.itemTitle,
            unitValue: result.unitValue,
            costGBP: result.costGBP,
            shippingFreight: result.shippingFreight,
            courierCharge: result.courierCharge,
            enhancedDataLoading: false,
            enhancedDataError: result.error,
            // Calculate profit fields for all sources
            ...calculateProfitFields(order, result)
          } : order));
          if (result.error) {
            toast({
              title: "Partial data loaded",
              description: `Order ${orderId}: ${result.error}`,
              variant: "destructive"
            });
          } else {
            toast({
              title: "Enhanced data loaded",
              description: `Successfully loaded details for order ${orderId}`
            });
          }
        } else {
          console.error('No matching result found for orderId:', orderId);
          throw new Error('No data found for this order');
        }
      } else {
        console.error('No results in response:', data);
        throw new Error('No results returned from API');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch enhanced data';
      setOrders(prev => prev.map(order => order.pkOrderID === orderId ? {
        ...order,
        enhancedDataLoading: false,
        enhancedDataError: errorMessage
      } : order));
      toast({
        title: "Error loading enhanced data",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const fetchAllEnhancedData = async () => {
    if (!authToken || orders.length === 0) return;
    setEnhancedDataLoading(true);
    try {
      const orderIds = orders.map(order => order.pkOrderID);
      const {
        data,
        error: fetchError
      } = await supabase.functions.invoke('linnworks-enhanced-orders', {
        body: {
          authToken,
          orderIds: orderIds
        }
      });
      if (fetchError) {
        throw new Error(fetchError.message);
      }
      if (data?.results) {
        const resultsMap = new Map(data.results.map((result: EnhancedOrderResult) => [result.orderId, result]));
        setOrders(prev => prev.map(order => {
          const result = resultsMap.get(order.pkOrderID) as EnhancedOrderResult;
          if (result) {
            return {
              ...order,
              sku: result.sku,
              orderQty: result.orderQty,
              itemTitle: result.itemTitle,
              unitValue: result.unitValue,
              costGBP: result.costGBP,
              shippingFreight: result.shippingFreight,
              courierCharge: result.courierCharge,
              enhancedDataLoading: false,
              enhancedDataError: result.error,
              // Calculate profit fields for all sources
              ...calculateProfitFields(order, result)
            };
          }
          return order;
        }));
        setShowEnhancedColumns(true);
        toast({
          title: "Enhanced data loaded",
          description: `Processed ${data.successful} successful, ${data.failed} failed out of ${data.processed} orders`
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch enhanced data';
      toast({
        title: "Error loading enhanced data",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setEnhancedDataLoading(false);
    }
  };

  const fetchAllOrdersForExport = async (): Promise<ProcessedOrder[]> => {
    if (!authToken) throw new Error('No auth token available');
    
    const allOrders: ProcessedOrder[] = [];
    let currentPage = 1;
    let totalPages = 1;

    // Build search filters based on user input
    const searchFilters = [];
    
    // Only add source filter if not "ALL"
    if (filters.source !== "ALL") {
      searchFilters.push({
        SearchField: "Source",
        SearchTerm: filters.source
      });
    }
    
    // Add SubSource filter if specified and not "all"
    if (filters.subSource.trim() && filters.subSource !== "all") {
      searchFilters.push({
        SearchField: "SubSource",
        SearchTerm: filters.subSource
      });
    }

    do {
      const { data, error } = await supabase.functions.invoke('linnworks-processed-orders', {
        body: {
          authToken,
          searchFilters,
          pageNumber: currentPage,
          resultsPerPage: 200,
          fromDate: `${format(filters.fromDate, "yyyy-MM-dd")}T00:00:00`,
          toDate: `${format(filters.toDate, "yyyy-MM-dd")}T00:00:00`
        }
      });

      if (error) throw new Error(error.message);
      
      const response = data as ProcessedOrdersResponse;
      if (response.ProcessedOrders) {
        allOrders.push(...response.ProcessedOrders.Data);
        totalPages = response.ProcessedOrders.TotalPages;
        currentPage++;
      } else {
        break;
      }
    } while (currentPage <= totalPages);

    return allOrders;
  };

  const fetchEnhancedDataForAllOrders = async (orders: ProcessedOrder[]): Promise<ProcessedOrder[]> => {
    if (!authToken || orders.length === 0) return orders;

    const batchSize = 50; // Process orders in smaller batches
    const updatedOrders = [...orders];
    
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      const orderIds = batch.map(order => order.pkOrderID);
      
      try {
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(orders.length/batchSize)} (${orderIds.length} orders)`);
        
        const { data, error: fetchError } = await supabase.functions.invoke('linnworks-enhanced-orders', {
          body: {
            authToken,
            orderIds: orderIds
          }
        });

        if (fetchError) {
          console.error(`Batch ${Math.floor(i/batchSize) + 1} error:`, fetchError.message);
          // Continue with next batch instead of failing completely
          continue;
        }

        if (data?.results) {
          const resultsMap = new Map(data.results.map((result: EnhancedOrderResult) => [result.orderId, result]));
          
          // Update the orders in this batch
          for (let j = 0; j < batch.length; j++) {
            const orderIndex = i + j;
            const order = batch[j];
            const result = resultsMap.get(order.pkOrderID) as EnhancedOrderResult;
            
            if (result) {
              updatedOrders[orderIndex] = {
                ...order,
                sku: result.sku,
                orderQty: result.orderQty,
                itemTitle: result.itemTitle,
                unitValue: result.unitValue,
                costGBP: result.costGBP,
                shippingFreight: result.shippingFreight,
                courierCharge: result.courierCharge,
                enhancedDataError: result.error,
                // Calculate profit fields for all sources
                ...calculateProfitFields(order, result)
              };
            }
          }
        }
        
        // Add a small delay between batches to avoid overwhelming the API
        if (i + batchSize < orders.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (err) {
        console.error(`Error processing batch ${Math.floor(i/batchSize) + 1}:`, err);
        // Continue with next batch
        continue;
      }
    }

    return updatedOrders;
  };

  const convertToCSV = (orders: ProcessedOrder[]): string => {
    const headers = [
      'Order ID',
      'Source',
      'Sub Source',
      'Selling Price (Inc. VAT)',
      'Processed Date',
      'SKU',
      'Order Qty',
      'Cost £',
      'Shipping Freight £',
      'Courier Charge £',
      'Marketplace Fee £',
      'VAT £',
      'Total Cost £',
      'Profit £'
    ];

    const csvRows = [headers.join(',')];

    orders.forEach(order => {
      const row = [
        `"${order.nOrderId}"`,
        `"${order.Source}"`,
        `"${order.SubSource || ''}"`,
        `"${(order.fTotalCharge || 0).toFixed(2)}"`,
        `"${new Date(order.dProcessedOn).toLocaleDateString()}"`,
        `"${order.sku || ''}"`,
        `"${order.orderQty || ''}"`,
        `"${order.costGBP || ''}"`,
        `"${order.shippingFreight || ''}"`,
        `"${order.courierCharge || ''}"`,
        `"${(order.marketplaceFee || 0).toFixed(2)}"`,
        `"${(order.vat || 0).toFixed(2)}"`,
        `"${(order.totalCost || 0).toFixed(2)}"`,
        `"${(order.profit || 0).toFixed(2)}"`
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAllOrders = async () => {
    if (!authToken) return;
    
    setExportLoading(true);
    try {
      toast({
        title: "Export started",
        description: "Fetching all orders from selected date range..."
      });

      // Step 1: Fetch all orders across all pages
      const allOrders = await fetchAllOrdersForExport();
      
      toast({
        title: "Orders fetched",
        description: `Fetched ${allOrders.length} orders. Now loading enhanced data in batches...`
      });

      // Step 2: Fetch enhanced data for all orders in batches
      const ordersWithEnhancedData = await fetchEnhancedDataForAllOrders(allOrders);

      toast({
        title: "Enhanced data loaded",
        description: "Converting to CSV and downloading..."
      });

      // Step 3: Convert to CSV and download
      const csvContent = convertToCSV(ordersWithEnhancedData);
      const filename = `processed-orders-${format(filters.fromDate, 'yyyy-MM-dd')}-to-${format(filters.toDate, 'yyyy-MM-dd')}.csv`;
      
      downloadCSV(csvContent, filename);

      toast({
        title: "Export completed",
        description: `Successfully exported ${ordersWithEnhancedData.length} orders to ${filename}`
      });
    } catch (err) {
      console.error('Export error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to export orders';
      toast({
        title: "Export failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchOrders();
    }
  }, [authToken]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(1);
  };

  const handleRefresh = async () => {
    await authenticate();
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Authenticating with Linnworks...</p>
          <p className="text-sm text-muted-foreground mt-2">This may take a few moments...</p>
        </div>
      </div>;
  }

  if (authError) {
    return <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Processed Orders - Linnworks Data</h1>
          <Button onClick={handleRefresh} disabled={authLoading}>
            {authLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="max-w-2xl">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-destructive mb-2">Authentication Failed</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Unable to connect to Linnworks API. This could be due to:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 mb-3">
                  <li>• Invalid or expired API credentials</li>
                  <li>• Network connectivity issues</li>
                  <li>• Linnworks API service problems</li>
                </ul>
                <details className="mt-3">
                  <summary className="text-sm font-medium cursor-pointer hover:text-foreground">Error Details</summary>
                  <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-32 border">{authError}</pre>
                </details>
              </div>
              <p className="text-muted-foreground">Click refresh to retry authentication and load orders.</p>
            </div>
          </CardContent>
        </Card>
      </div>;
  }

  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Processed Orders - Linnworks Data</h1>
        <Button onClick={handleRefresh} disabled={isLoading || authLoading}>
          {isLoading || authLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFilterSubmit} className="flex items-end gap-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.fromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.fromDate ? format(filters.fromDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.fromDate}
                    onSelect={(date) => {
                      if (date) {
                        setFilters(prev => ({
                          ...prev,
                          fromDate: date
                        }));
                      }
                    }}
                    disabled={(date) => {
                      // Disable dates that are the same as toDate or after toDate
                      return date >= filters.toDate;
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.toDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.toDate ? format(filters.toDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.toDate}
                    onSelect={(date) => {
                      if (date) {
                        setFilters(prev => ({
                          ...prev,
                          toDate: date
                        }));
                      }
                    }}
                    disabled={(date) => {
                      // Disable dates that are the same as fromDate or before fromDate
                      return date <= filters.fromDate;
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="source">Source</Label>
              <Select value={filters.source} onValueChange={value => setFilters(prev => ({
              ...prev,
              source: value,
              subSource: (value === "VIRTUALSTOCK" || value === "Mirakl MP") ? prev.subSource : "all" // Reset subSource when not VIRTUALSTOCK or Mirakl MP
            }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                 <SelectContent className="bg-background z-50">
                   <SelectItem value="ALL">ALL</SelectItem>
                   <SelectItem value="AMAZON">AMAZON</SelectItem>
                   <SelectItem value="Mirakl MP">Mirakl MP</SelectItem>
                   <SelectItem value="EBAY">EBAY</SelectItem>
                   <SelectItem value="Manomano hub">Manomano hub</SelectItem>
                   <SelectItem value="OnBuy v2">OnBuy v2</SelectItem>
                   <SelectItem value="VIRTUALSTOCK">VIRTUALSTOCK</SelectItem>
                   <SelectItem value="SHEIN">SHEIN</SelectItem>
                   <SelectItem value="SHOPIFY">SHOPIFY</SelectItem>
                   <SelectItem value="TESCO">TESCO</SelectItem>
                   <SelectItem value="TheRange">TheRange</SelectItem>
                   <SelectItem value="TikTok">TikTok</SelectItem>
                   <SelectItem value="WAYFAIRCHANNEL">WAYFAIRCHANNEL</SelectItem>
                   <SelectItem value="GROUPON">GROUPON</SelectItem>
                 </SelectContent>
              </Select>
            </div>
            {(filters.source === "VIRTUALSTOCK" || filters.source === "Mirakl MP") && (
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="subSource">Sub Source</Label>
                <Select value={filters.subSource || "all"} onValueChange={value => setFilters(prev => ({
                  ...prev,
                  subSource: value
                }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub source" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="all">All Sub Sources</SelectItem>
                    {filters.source === "VIRTUALSTOCK" && (
                      <>
                        <SelectItem value="Wilko">Wilko</SelectItem>
                        <SelectItem value="Robert Dyas">Robert Dyas</SelectItem>
                      </>
                    )}
                    {filters.source === "Mirakl MP" && (
                      <>
                        <SelectItem value="B&Q">B&Q</SelectItem>
                        <SelectItem value="Debenhams">Debenhams</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" disabled={isLoading}>
              Apply Filters
            </Button>
            <Button onClick={fetchAllEnhancedData} disabled={isLoading || enhancedDataLoading || orders.length === 0} variant="outline">
              {enhancedDataLoading ? "Loading..." : "Fetch All Details"}
            </Button>
            <Button onClick={() => setShowEnhancedColumns(!showEnhancedColumns)} variant="outline" size="sm">
              {showEnhancedColumns ? "Hide" : "Show"} Enhanced Data
            </Button>
            <Button onClick={handleExportAllOrders} disabled={isLoading || exportLoading} variant="outline" className="gap-2">
              {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exportLoading ? "Exporting..." : "Export All"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Orders ({pagination.totalEntries} total)</span>
            <Badge variant="outline">
              Page {pagination.pageNumber} of {pagination.totalPages}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-[600px] overflow-auto">
            <Table noWrapper>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 border-b">Order ID</TableHead>
                  <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 border-b">Source</TableHead>
                  <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 border-b">Sub Source</TableHead>
                  <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 border-b">Selling Price (Inc. VAT)</TableHead>
                  <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 border-b">Processed Date</TableHead>
                  {showEnhancedColumns && <>
                      <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 border-b">SKU</TableHead>
                      <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 border-b">Order Qty</TableHead>
                      <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 border-b">Cost £</TableHead>
                      <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 border-b">Shipping Freight £</TableHead>
                      <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 border-b">Courier Charge £</TableHead>
                      <TableHead className="sticky top-0 bg-green-200/95 backdrop-blur-sm z-20 border-b">Marketplace Fee £</TableHead>
                      <TableHead className="sticky top-0 bg-green-200/95 backdrop-blur-sm z-20 border-b">VAT £</TableHead>
                      <TableHead className="sticky top-0 bg-green-200/95 backdrop-blur-sm z-20 border-b">Total Cost £</TableHead>
                      <TableHead className="sticky top-0 bg-green-200/95 backdrop-blur-sm z-20 border-b">Profit £</TableHead>
                    </>}
                  <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 border-b">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => <TableRow key={order.pkOrderID}>
                    <TableCell className="font-mono text-xs">{order.nOrderId}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{order.Source}</Badge>
                    </TableCell>
                    <TableCell>
                      {order.SubSource ? (
                        <Badge variant="outline" className="text-xs">{order.SubSource}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>{order.fTotalCharge?.toFixed(2)}</TableCell>
                    <TableCell>{new Date(order.dProcessedOn).toLocaleDateString()}</TableCell>
                    {showEnhancedColumns && <>
                        <TableCell>
                          {order.enhancedDataLoading ? <div className="animate-pulse">Loading...</div> : order.enhancedDataError ? <div className="text-destructive text-xs">Error</div> : order.sku || "N/A"}
                        </TableCell>
                        <TableCell>
                          {order.enhancedDataLoading ? <div className="animate-pulse">Loading...</div> : order.orderQty || "N/A"}
                        </TableCell>
                        <TableCell>
                          {order.enhancedDataLoading ? <div className="animate-pulse">Loading...</div> : order.costGBP || "N/A"}
                        </TableCell>
                        <TableCell>
                          {order.enhancedDataLoading ? <div className="animate-pulse">Loading...</div> : order.shippingFreight || "N/A"}
                        </TableCell>
                        <TableCell>
                          {order.enhancedDataLoading ? <div className="animate-pulse">Loading...</div> : order.courierCharge || "N/A"}
                        </TableCell>
                        <TableCell className="bg-green-200">
                          {order.enhancedDataLoading ? <div className="animate-pulse">Loading...</div> : (order.marketplaceFee?.toFixed(2) || "N/A")}
                        </TableCell>
                        <TableCell className="bg-green-200">
                          {order.enhancedDataLoading ? (
                            <div className="animate-pulse">Loading...</div>
                          ) : order.Source === 'WAYFAIRCHANNEL' && order.vatA !== undefined ? (
                            <div className="text-xs">
                              <div>VATA: {order.vatA.toFixed(2)}</div>
                              <div>VATB: {(order.vat || 0).toFixed(2)}</div>
                            </div>
                          ) : (
                            order.vat?.toFixed(2) || "N/A"
                          )}
                        </TableCell>
                        <TableCell className="bg-green-200">
                          {order.enhancedDataLoading ? <div className="animate-pulse">Loading...</div> : (order.totalCost?.toFixed(2) || "N/A")}
                        </TableCell>
                        <TableCell className={`bg-green-200 ${order.profit && order.profit < 0 ? "text-destructive font-semibold" : order.profit && order.profit > 0 ? "text-green-600 font-semibold" : ""}`}>
                          {order.enhancedDataLoading ? <div className="animate-pulse">Loading...</div> : (order.profit?.toFixed(2) || "N/A")}
                        </TableCell>
                      </>}
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => fetchEnhancedDataForOrder(order.pkOrderID)} disabled={order.enhancedDataLoading || !!order.sku}>
                        {order.enhancedDataLoading ? "Loading..." : order.sku ? "Loaded" : "Fetch Details"}
                      </Button>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </div>
          
          {pagination.totalPages > 1 && <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={() => fetchOrders(pagination.pageNumber - 1)} disabled={pagination.pageNumber <= 1 || isLoading}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Showing {orders.length} of {pagination.totalEntries} orders
              </span>
              <Button variant="outline" onClick={() => fetchOrders(pagination.pageNumber + 1)} disabled={pagination.pageNumber >= pagination.totalPages || isLoading}>
                Next
              </Button>
            </div>}
        </CardContent>
      </Card>
    </div>;
}
