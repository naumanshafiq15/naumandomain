import { useState, useEffect } from "react";
import { useLinnworksAuth } from "@/hooks/use-linnworks-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProcessedOrder {
  pkOrderID: string;
  dReceivedDate: string;
  dProcessedOn: string;
  fTotalCharge: number;
  cCurrency: string;
  PostalTrackingNumber: string;
  cCountry: string;
  Source: string;
  ReferenceNum: string;
  cFullName: string;
  cEmailAddress: string;
  Town: string;
  cPostCode: string;
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

export default function ProcessedOrders() {
  const { authToken, isLoading: authLoading, error: authError, authenticate } = useLinnworksAuth();
  const [orders, setOrders] = useState<ProcessedOrder[]>([]);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    entriesPerPage: 200,
    totalEntries: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    fromDate: "2025-05-01",
    toDate: "2025-09-01",
    source: "DIRECT",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchOrders = async (pageNumber = 1) => {
    if (!authToken) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('linnworks-processed-orders', {
        body: {
          authToken,
          searchFilters: [
            {
              SearchField: "Source",
              SearchTerm: filters.source
            }
          ],
          pageNumber,
          resultsPerPage: 200,
          fromDate: `${filters.fromDate}T00:00:00`,
          toDate: `${filters.toDate}T00:00:00`,
        },
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
          totalPages: response.ProcessedOrders.TotalPages,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch orders';
      toast({
        title: "Error fetching orders",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
    }).format(amount);
  };

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
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-destructive">Authentication failed: {authError}</p>
        <Button onClick={authenticate}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Authentication
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Processed Orders</h1>
        <Button onClick={() => fetchOrders(pagination.pageNumber)} disabled={isLoading}>
          {isLoading ? (
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
          <form onSubmit={handleFilterSubmit} className="flex items-end gap-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                type="date"
                id="fromDate"
                value={filters.fromDate}
                onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="toDate">To Date</Label>
              <Input
                type="date"
                id="toDate"
                value={filters.toDate}
                onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={filters.source}
                onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
                placeholder="e.g., DIRECT"
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              Apply Filters
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Processed Date</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.pkOrderID}>
                    <TableCell className="font-medium">
                      {order.ReferenceNum}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.cFullName}</div>
                        <div className="text-sm text-muted-foreground">{order.cEmailAddress}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(order.fTotalCharge, order.cCurrency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {order.PostalTrackingNumber || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.Source}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(order.dProcessedOn)}</TableCell>
                    <TableCell>
                      <div>
                        <div>{order.Town}</div>
                        <div className="text-sm text-muted-foreground">
                          {order.cPostCode}, {order.cCountry}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => fetchOrders(pagination.pageNumber - 1)}
                disabled={pagination.pageNumber <= 1 || isLoading}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Showing {orders.length} of {pagination.totalEntries} orders
              </span>
              <Button
                variant="outline"
                onClick={() => fetchOrders(pagination.pageNumber + 1)}
                disabled={pagination.pageNumber >= pagination.totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}