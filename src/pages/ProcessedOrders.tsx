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
  itemTitle?: string;
  unitValue?: number;
  costGBP?: string;
  shippingFreight?: string;
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
  itemTitle?: string;
  unitValue?: number;
  costGBP?: string;
  shippingFreight?: string;
  error?: string;
  success?: boolean;
}

export default function ProcessedOrders() {
  const { authToken, isLoading: authLoading, error: authError, authenticate } = useLinnworksAuth();
  const [orders, setOrders] = useState<ProcessedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [enhancedDataLoading, setEnhancedDataLoading] = useState(false);
  const [showEnhancedColumns, setShowEnhancedColumns] = useState(false);
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

  const fetchEnhancedDataForOrder = async (orderId: string) => {
    if (!authToken) return;

    // Mark this order as loading
    setOrders(prev => prev.map(order => 
      order.pkOrderID === orderId 
        ? { ...order, enhancedDataLoading: true, enhancedDataError: undefined }
        : order
    ));

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('linnworks-enhanced-orders', {
        body: {
          authToken,
          orderIds: [orderId]
        }
      });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (data?.results && data.results.length > 0) {
        const result = data.results[0] as EnhancedOrderResult;
        
        setOrders(prev => prev.map(order => 
          order.pkOrderID === orderId 
            ? { 
                ...order, 
                sku: result.sku,
                itemTitle: result.itemTitle,
                unitValue: result.unitValue,
                costGBP: result.costGBP,
                shippingFreight: result.shippingFreight,
                enhancedDataLoading: false,
                enhancedDataError: result.error
              }
            : order
        ));

        if (result.error) {
          toast({
            title: "Partial data loaded",
            description: `Order ${orderId}: ${result.error}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Enhanced data loaded",
            description: `Successfully loaded details for order ${orderId}`,
          });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch enhanced data';
      setOrders(prev => prev.map(order => 
        order.pkOrderID === orderId 
          ? { ...order, enhancedDataLoading: false, enhancedDataError: errorMessage }
          : order
      ));
      
      toast({
        title: "Error loading enhanced data",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const fetchAllEnhancedData = async () => {
    if (!authToken || orders.length === 0) return;

    setEnhancedDataLoading(true);
    
    try {
      const orderIds = orders.map(order => order.pkOrderID);
      
      const { data, error: fetchError } = await supabase.functions.invoke('linnworks-enhanced-orders', {
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
              itemTitle: result.itemTitle,
              unitValue: result.unitValue,
              costGBP: result.costGBP,
              shippingFreight: result.shippingFreight,
              enhancedDataLoading: false,
              enhancedDataError: result.error
            };
          }
          return order;
        }));

        setShowEnhancedColumns(true);
        
        toast({
          title: "Enhanced data loaded",
          description: `Processed ${data.successful} successful, ${data.failed} failed out of ${data.processed} orders`,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch enhanced data';
      toast({
        title: "Error loading enhanced data",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setEnhancedDataLoading(false);
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
            <Button 
              onClick={fetchAllEnhancedData} 
              disabled={isLoading || enhancedDataLoading || orders.length === 0}
              variant="outline"
            >
              {enhancedDataLoading ? "Loading..." : "Fetch All Details"}
            </Button>
            <Button 
              onClick={() => setShowEnhancedColumns(!showEnhancedColumns)}
              variant="outline"
              size="sm"
            >
              {showEnhancedColumns ? "Hide" : "Show"} Enhanced Data
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
                  <TableHead>Reference</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Received Date</TableHead>
                  <TableHead>Processed Date</TableHead>
                  <TableHead>Tracking</TableHead>
                  {showEnhancedColumns && (
                    <>
                      <TableHead>SKU</TableHead>
                      <TableHead>Item Title</TableHead>
                      <TableHead>Cost £</TableHead>
                      <TableHead>Shipping Freight £</TableHead>
                    </>
                  )}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.pkOrderID}>
                    <TableCell className="font-mono text-xs">{order.nOrderId}</TableCell>
                    <TableCell>{order.ReferenceNum}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.cFullName}</div>
                        <div className="text-sm text-muted-foreground">{order.cEmailAddress}</div>
                      </div>
                    </TableCell>
                    <TableCell>{order.cCountry}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{order.Source}</Badge>
                    </TableCell>
                    <TableCell>{order.fTotalCharge?.toFixed(2)}</TableCell>
                    <TableCell>{order.cCurrency}</TableCell>
                    <TableCell>{new Date(order.dReceivedDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(order.dProcessedOn).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-xs">{order.PostalTrackingNumber}</TableCell>
                    {showEnhancedColumns && (
                      <>
                        <TableCell>
                          {order.enhancedDataLoading ? (
                            <div className="animate-pulse">Loading...</div>
                          ) : order.enhancedDataError ? (
                            <div className="text-destructive text-xs">Error</div>
                          ) : (
                            order.sku || "N/A"
                          )}
                        </TableCell>
                        <TableCell>
                          {order.enhancedDataLoading ? (
                            <div className="animate-pulse">Loading...</div>
                          ) : (
                            <div className="max-w-[200px] truncate" title={order.itemTitle}>
                              {order.itemTitle || "N/A"}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.enhancedDataLoading ? (
                            <div className="animate-pulse">Loading...</div>
                          ) : (
                            order.costGBP || "N/A"
                          )}
                        </TableCell>
                        <TableCell>
                          {order.enhancedDataLoading ? (
                            <div className="animate-pulse">Loading...</div>
                          ) : (
                            order.shippingFreight || "N/A"
                          )}
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchEnhancedDataForOrder(order.pkOrderID)}
                        disabled={order.enhancedDataLoading || !!order.sku}
                      >
                        {order.enhancedDataLoading ? "Loading..." : order.sku ? "Loaded" : "Fetch Details"}
                      </Button>
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