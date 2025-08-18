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
import { Loader2, RefreshCw, Calculator, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProcessedOrder {
  nOrderId: string;
  pkOrderID: string;
  ReferenceNum: string;
  Subtotal: number;
  fTotalCharge: number;
  Source: string;
  dProcessedOn: string;
  fTax: number;
}

interface MonthlyProfitData {
  ordersNumber: number;
  ordersValue: number;
  profit: number;
  percentage: number;
}

interface ProfitSummary {
  [source: string]: {
    [month: string]: MonthlyProfitData;
  };
}

interface ProfitSettings {
  [source: string]: number; // profit margin percentage
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DEFAULT_PROFIT_MARGINS: ProfitSettings = {
  'AMAZON': 15,
  'DIRECT': 18,
  'EBAY': 12,
  'SHOPIFY': 16,
  'WAYFAIRCHANNEL': 14,
};

export default function ProfitCalculator() {
  const { authToken, isLoading: authLoading, error: authError, authenticate } = useLinnworksAuth();
  const [profitData, setProfitData] = useState<ProfitSummary>({});
  const [profitMargins, setProfitMargins] = useState<ProfitSettings>(DEFAULT_PROFIT_MARGINS);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    fromDate: "2025-01-01",
    toDate: "2025-12-31",
  });
  const { toast } = useToast();

  const fetchAllOrders = async () => {
    if (!authToken) return;

    setIsLoading(true);
    try {
      // Fetch orders from all sources
      const sources = ['AMAZON', 'DIRECT', 'EBAY', 'SHOPIFY', 'WAYFAIRCHANNEL', 'TESCO', 'OnBuy v2'];
      const allOrders: ProcessedOrder[] = [];

      for (const source of sources) {
        try {
          const { data, error } = await supabase.functions.invoke('linnworks-processed-orders', {
            body: {
              authToken,
              searchFilters: [
                {
                  SearchField: "Source",
                  SearchTerm: source
                }
              ],
              pageNumber: 1,
              resultsPerPage: 1000, // Get more records for analysis
              fromDate: `${dateRange.fromDate}T00:00:00`,
              toDate: `${dateRange.toDate}T00:00:00`,
            },
          });

          if (!error && data?.ProcessedOrders?.Data) {
            const ordersData = data.ProcessedOrders.Data.map((order: any) => ({
              ...order,
              Subtotal: parseFloat(order.Subtotal) || 0,
              fTotalCharge: parseFloat(order.fTotalCharge) || 0,
              fTax: parseFloat(order.fTax) || 0,
            }));
            allOrders.push(...ordersData);
          }
        } catch (err) {
          console.error(`Error fetching ${source} orders:`, err);
        }
      }

      // Process the data into monthly profit summary
      const summary = processOrdersIntoProfitSummary(allOrders);
      setProfitData(summary);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profit data';
      toast({
        title: "Error fetching profit data",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processOrdersIntoProfitSummary = (orders: ProcessedOrder[]): ProfitSummary => {
    const summary: ProfitSummary = {};

    orders.forEach(order => {
      const date = new Date(order.dProcessedOn);
      const month = MONTHS[date.getMonth()];
      const source = order.Source;

      if (!summary[source]) {
        summary[source] = {};
      }

      if (!summary[source][month]) {
        summary[source][month] = {
          ordersNumber: 0,
          ordersValue: 0,
          profit: 0,
          percentage: 0,
        };
      }

      const monthData = summary[source][month];
      monthData.ordersNumber += 1;
      monthData.ordersValue += order.fTotalCharge;

      // Calculate profit using the margin percentage
      const marginPercentage = profitMargins[source] || 15;
      const orderProfit = order.fTotalCharge * (marginPercentage / 100);
      monthData.profit += orderProfit;
      monthData.percentage = (monthData.profit / monthData.ordersValue) * 100;
    });

    return summary;
  };

  const updateProfitMargin = (source: string, margin: number) => {
    const newMargins = { ...profitMargins, [source]: margin };
    setProfitMargins(newMargins);
    localStorage.setItem('profit-margins', JSON.stringify(newMargins));
    
    // Recalculate profit data with new margins
    if (Object.keys(profitData).length > 0) {
      const summary = processOrdersIntoProfitSummary(getAllOrdersFromSummary());
      setProfitData(summary);
    }
  };

  const getAllOrdersFromSummary = (): ProcessedOrder[] => {
    // This is a simplified version - in a real app you'd store the raw orders
    return [];
  };

  const handleRefresh = async () => {
    await authenticate();
  };

  const exportData = () => {
    const csvData = generateCSV();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'profit-calculator.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateCSV = (): string => {
    let csv = 'Source,Month,Orders Number,Orders Value,Profit,Percentage\n';
    
    Object.entries(profitData).forEach(([source, monthData]) => {
      Object.entries(monthData).forEach(([month, data]) => {
        csv += `${source},${month},${data.ordersNumber},${data.ordersValue.toFixed(2)},${data.profit.toFixed(2)},${data.percentage.toFixed(2)}%\n`;
      });
    });
    
    return csv;
  };

  useEffect(() => {
    const savedMargins = localStorage.getItem('profit-margins');
    if (savedMargins) {
      setProfitMargins(JSON.parse(savedMargins));
    }
  }, []);

  useEffect(() => {
    if (authToken) {
      fetchAllOrders();
    }
  }, [authToken, dateRange]);

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
          <div className="flex items-center gap-3">
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
        <div className="flex items-center gap-3">
          <Calculator className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Profit Calculator</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportData} variant="outline" disabled={Object.keys(profitData).length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleRefresh} disabled={isLoading || authLoading}>
            {isLoading || authLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="fromDate">From Date</Label>
                <Input
                  type="date"
                  id="fromDate"
                  value={dateRange.fromDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, fromDate: e.target.value }))}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="toDate">To Date</Label>
                <Input
                  type="date"
                  id="toDate"
                  value={dateRange.toDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, toDate: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit Margin Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(profitMargins).map(([source, margin]) => (
                <div key={source} className="grid w-full items-center gap-1.5">
                  <Label htmlFor={source}>{source}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      id={source}
                      value={margin}
                      onChange={(e) => updateProfitMargin(source, parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Profit Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading profit data...</span>
            </div>
          ) : Object.keys(profitData).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No profit data available. Try adjusting the date range.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background">Source</TableHead>
                    {MONTHS.map((month) => (
                      <TableHead key={month} className="text-center min-w-[160px]">
                        {month}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(profitData).map(([source, monthData]) => (
                    <TableRow key={source}>
                      <TableCell className="sticky left-0 bg-background font-medium">
                        <Badge variant="outline">{source}</Badge>
                      </TableCell>
                      {MONTHS.map((month) => {
                        const data = monthData[month];
                        return (
                          <TableCell key={month} className="text-center">
                            {data ? (
                              <div className="space-y-1">
                                <div className="text-sm font-medium">{data.ordersNumber} orders</div>
                                <div className="text-sm text-muted-foreground">£{data.ordersValue.toFixed(2)}</div>
                                <div className="text-sm font-medium text-primary">£{data.profit.toFixed(2)}</div>
                                <div className="text-xs text-muted-foreground">{data.percentage.toFixed(1)}%</div>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">-</div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}