import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, TrendingUp, Settings, ArrowRight } from "lucide-react";

const dashboardPages = [
  {
    title: "Processed Orders",
    description: "View and manage processed orders from Linnworks",
    href: "/processed-orders",
    icon: Package,
    color: "text-blue-600",
  },
  {
    title: "Profit Calculator",
    description: "Monthly profit analysis by source with detailed metrics",
    href: "/page-2",
    icon: ShoppingCart,
    color: "text-green-600",
  },
  {
    title: "Page 3",
    description: "Additional dashboard page (coming soon)",
    href: "/page-3",
    icon: TrendingUp,
    color: "text-purple-600",
  },
  {
    title: "Page 4",
    description: "Additional dashboard page (coming soon)",
    href: "/page-4",
    icon: Settings,
    color: "text-orange-600",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Linnworks API Dashboard</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage your Linnworks data across multiple views and insights
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardPages.map((page) => {
            const Icon = page.icon;
            return (
              <Card key={page.href} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-6 w-6 ${page.color}`} />
                    <CardTitle className="text-lg">{page.title}</CardTitle>
                  </div>
                  <CardDescription>{page.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link to={page.href}>
                      Open
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Index;
