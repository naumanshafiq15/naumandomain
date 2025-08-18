import { useState, useEffect } from "react";
import { useLinnworksAuth } from "@/hooks/use-linnworks-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProcessedOrder {
  nOrderId: string;
  pkOrderID: string;
  ReferenceNum: string;
  Subtotal: string;
  fTotalCharge: string;
  PostalServiceName: string;
  Source: string;
  SubSource: string;
  fTax: string;
  dProcessedOn: string;
  ProfitMargin: string;
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

interface MonthlyProfitData {
  source: string;
  month: string;
  ordersNumber: number;
  ordersValue: number;
  profit: number;
  percentage: number;
}

const sources = [
  "DIRECT", "AMAZON", "Mirakl MP", "EBAY", "Manomano hub", 
  "OnBuy v2", "VIRTUALSTOCK", "SHEIN", "SHOPIFY", "TESCO", 
  "TheRange", "TikTok", "WAYFAIRCHANNEL"
];

const COST_PERCENTAGE = 0.70; // 70% cost, 30% profit margin

export default function ProfitCalculator() {
  const { authToken, isLoading: authLoading, error: authError, authenticate } = useLinnworksAuth();
  const [allOrders, setAllOrders] = useState<ProcessedOrder[]>([]);
  const [profitData, setProfitData] = useState<MonthlyProfitData[]>([]);
  const [filters, setFilters] = useState({
    fromMonth: "2025-01",
    toMonth: "2025-12",
    selectedSources: ["AMAZON"] as string[], // Start with just Amazon
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentlyFetching, setCurrentlyFetching] = useState<string>("");
  const { toast } = useToast();

  const formatMonth = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  const fetchAllOrders = async () => {
    if (!authToken) return;

    setIsLoading(true);
    setAllOrders([]); // Clear previous data
    setProfitData([]); // Clear previous profit data
    const allOrdersData: ProcessedOrder[] = [];

    try {
      // Fetch orders only from selected sources
      for (const source of filters.selectedSources) {
        setCurrentlyFetching(`Loading ${source}...`);
        let pageNumber = 1;
        let hasMorePages = true;

        // Limit to first 3 pages per source for faster loading
        while (hasMorePages && pageNumber <= 3) {
          const { data, error } = await supabase.functions.invoke('linnworks-processed-orders', {
            body: {
              authToken,
              searchFilters: [
                {
                  SearchField: "Source",
                  SearchTerm: source
                }
              ],
              pageNumber,
              resultsPerPage: 200,
              fromDate: `${filters.fromMonth}-01T00:00:00`,
              toDate: `${filters.toMonth}-31T23:59:59`,
            },
          });

          if (error) {
            console.error(`Error fetching ${source} orders:`, error);
            break;
          }

          const response = data as ProcessedOrdersResponse;
          if (response.ProcessedOrders && response.ProcessedOrders.Data) {
            allOrdersData.push(...response.ProcessedOrders.Data);
            
            // Update data progressively
            setAllOrders([...allOrdersData]);
            processProfitData([...allOrdersData]);
            
            // Check if there are more pages (but limit to 3 for speed)
            hasMorePages = pageNumber < response.ProcessedOrders.TotalPages && pageNumber < 3;
            pageNumber++;
          } else {
            hasMorePages = false;
          }
        }
      }

      setCurrentlyFetching("");
      toast({
        title: "Data loaded successfully",
        description: `Loaded ${allOrdersData.length} orders from ${filters.selectedSources.length} sources`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch orders';
      setCurrentlyFetching("");
      toast({
        title: "Error fetching orders",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setCurrentlyFetching("");
    }
  };

  const processProfitData = (orders: ProcessedOrder[]) => {
    const monthlyData: { [key: string]: MonthlyProfitData } = {};

    orders.forEach(order => {
      if (!order.dProcessedOn) return; // Skip orders without processed date
      
      const orderDate = new Date(order.dProcessedOn);
      const month = orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      const source = order.Source;
      const key = `${source}-${month}`;

      const subtotal = parseFloat(order.Subtotal) || 0;
      const totalCharge = parseFloat(order.fTotalCharge) || 0;
      
      // Calculate profit: assume 70% cost ratio
      const calculatedProfit = subtotal * (1 - COST_PERCENTAGE);

      if (!monthlyData[key]) {
        monthlyData[key] = {
          source,
          month,
          ordersNumber: 0,
          ordersValue: 0,
          profit: 0,
          percentage: 0,
        };
      }

      monthlyData[key].ordersNumber += 1;
      monthlyData[key].ordersValue += totalCharge;
      monthlyData[key].profit += calculatedProfit;
    });

    // Calculate percentages
    Object.values(monthlyData).forEach(data => {
      data.percentage = data.ordersValue > 0 ? (data.profit / data.ordersValue) * 100 : 0;
    });

    setProfitData(Object.values(monthlyData).sort((a, b) => {
      if (a.source === b.source) {
        // Sort by date properly
        const dateA = new Date(a.month + " 1");
        const dateB = new Date(b.month + " 1");
        return dateA.getTime() - dateB.getTime();
      }
      return a.source.localeCompare(b.source);
    }));
  };

  useEffect(() => {
    if (authToken) {
      fetchAllOrders();
    }
  }, [authToken]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAllOrders();
  };

  const handleRefresh = async () => {
    await authenticate();
  };

  const groupedData = profitData.reduce((acc, item) => {
    if (!acc[item.source]) {
      acc[item.source] = [];
    }
    acc[item.source].push(item);
    return acc;
  }, {} as { [source: string]: MonthlyProfitData[] });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Authenticating with Linnworks...</span>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calculator className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Profit Calculator</h1>
          </div>
          <Button onClick={handleRefresh} disabled={authLoading}>
            {authLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Click refresh to authenticate and load profit data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calculator className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Profit Calculator</h1>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading || authLoading}>
          {isLoading || authLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFilterSubmit} className="space-y-4">
            <div className="flex gap-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="fromMonth">From Month</Label>
                <Input
                  type="month"
                  id="fromMonth"
                  value={filters.fromMonth}
                  onChange={(e) => setFilters(prev => ({ ...prev, fromMonth: e.target.value }))}
                />
              </div>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="toMonth">To Month</Label>
                <Input
                  type="month"
                  id="toMonth"
                  value={filters.toMonth}
                  onChange={(e) => setFilters(prev => ({ ...prev, toMonth: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Select Sources (max 3 for faster loading)</Label>
              <div className="grid grid-cols-3 gap-2">
                {sources.slice(0, 9).map((source) => (
                  <label key={source} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.selectedSources.includes(source)}
                      onChange={(e) => {
                        if (e.target.checked && filters.selectedSources.length < 3) {
                          setFilters(prev => ({ 
                            ...prev, 
                            selectedSources: [...prev.selectedSources, source] 
                          }));
                        } else if (!e.target.checked) {
                          setFilters(prev => ({ 
                            ...prev, 
                            selectedSources: prev.selectedSources.filter(s => s !== source) 
                          }));
                        }
                      }}
                      disabled={!filters.selectedSources.includes(source) && filters.selectedSources.length >= 3}
                      className="rounded border-gray-300"
                    />
                    <span className={!filters.selectedSources.includes(source) && filters.selectedSources.length >= 3 ? "text-gray-400" : ""}>
                      {source}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            <Button type="submit" disabled={isLoading || filters.selectedSources.length === 0}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Load Data ({filters.selectedSources.length} sources)
            </Button>
          </form>
        </CardContent>
      </Card>

      {profitData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Monthly Profit Analysis by Source</span>
              <Badge variant="outline">
                {Object.keys(groupedData).length} Sources, {allOrders.length} Orders
                {currentlyFetching && ` - ${currentlyFetching}`}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Orders Number</TableHead>
                    <TableHead className="text-right">Orders Value</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Percent%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedData).map(([source, sourceData]) => (
                    sourceData.map((data, index) => (
                      <TableRow key={`${source}-${data.month}`}>
                        <TableCell className="font-medium">
                          {index === 0 ? (
                            <Badge variant="outline">{source}</Badge>
                          ) : (
                            <span className="text-muted-foreground">↳</span>
                          )}
                        </TableCell>
                        <TableCell>{data.month}</TableCell>
                        <TableCell className="text-right font-medium">
                          {data.ordersNumber}
                        </TableCell>
                        <TableCell className="text-right">
                          £{data.ordersValue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          £{data.profit.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={data.percentage > 20 ? "default" : "secondary"}>
                            {data.percentage.toFixed(2)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>{currentlyFetching || "Loading profit data..."}</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}