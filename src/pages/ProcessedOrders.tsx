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
import { Loader2, RefreshCw } from "lucide-react";
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

  const handleRefresh = async () => {
    // First authenticate to get a fresh token
    await authenticate();
    // The useEffect will automatically call fetchOrders when the new authToken is received
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Processed Orders - Linnworks Data</h1>
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
            <p className="text-muted-foreground">Click refresh to authenticate and load orders.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Processed Orders - Linnworks Data</h1>
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
              <Select
                value={filters.source}
                onValueChange={(value) => setFilters(prev => ({ ...prev, source: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIRECT">DIRECT</SelectItem>
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
                </SelectContent>
              </Select>
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
                  <TableHead>PK Order ID</TableHead>
                  <TableHead>Reference Number</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>Total Charge</TableHead>
                  <TableHead>Postal Service</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Sub Source</TableHead>
                  <TableHead>Tax</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.pkOrderID}>
                    <TableCell className="font-medium">
                      {order.nOrderId}
                    </TableCell>
                    <TableCell>
                      {order.pkOrderID}
                    </TableCell>
                    <TableCell>
                      {order.ReferenceNum}
                    </TableCell>
                    <TableCell>
                      {order.Subtotal}
                    </TableCell>
                    <TableCell>
                      {order.fTotalCharge}
                    </TableCell>
                    <TableCell>
                      {order.PostalServiceName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.Source}</Badge>
                    </TableCell>
                    <TableCell>
                      {order.SubSource}
                    </TableCell>
                    <TableCell>
                      {order.fTax}
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