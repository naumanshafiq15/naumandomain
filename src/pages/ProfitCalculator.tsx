import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLinnworksAuth } from "@/hooks/use-linnworks-auth";
import { supabase } from "@/integrations/supabase/client";

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

export function ProfitCalculator() {
  const [profitData, setProfitData] = useState<SourceProfitData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { authToken, isLoading: authLoading, authenticate } = useLinnworksAuth();
  const { toast } = useToast();

  const fetchProfitData = async () => {
    if (!authToken) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('linnworks-profit-calculator', {
        body: {
          authToken,
          fromDate: "2024-01-01T00:00:00",
          toDate: "2025-12-31T23:59:59"
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setProfitData(data?.profitData || []);
      toast({
        title: "Success",
        description: "Profit data loaded successfully",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profit data';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await authenticate();
  };

  useEffect(() => {
    if (authToken) {
      fetchProfitData();
    }
  }, [authToken]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Authenticating with Linnworks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Profit Calculator</h1>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading || authLoading}>
          {isLoading || authLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Data
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profit data...</p>
          </div>
        </div>
      ) : profitData.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No profit data available</h3>
              <p className="text-muted-foreground">Click refresh to load profit calculations</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {profitData.map((sourceData) => (
            <Card key={sourceData.source}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{sourceData.source}</span>
                  <div className="text-sm text-muted-foreground">
                    Total: {sourceData.totalOrders} orders • {formatCurrency(sourceData.totalValue)} • {formatPercent(sourceData.averageProfitPercent)} avg profit
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Orders Number</TableHead>
                      <TableHead className="text-right">Orders Value</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Profit %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceData.monthlyData.map((monthData, index) => (
                      <TableRow key={`${monthData.year}-${monthData.month}`}>
                        <TableCell className="font-medium">
                          {monthData.month} {monthData.year}
                        </TableCell>
                        <TableCell className="text-right">
                          {monthData.ordersNumber.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(monthData.ordersValue)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(monthData.profit)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {formatPercent(monthData.profitPercent)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 bg-muted/50">
                      <TableCell className="font-bold">Total</TableCell>
                      <TableCell className="text-right font-bold">
                        {sourceData.totalOrders.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(sourceData.totalValue)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatCurrency(sourceData.totalProfit)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatPercent(sourceData.averageProfitPercent)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}