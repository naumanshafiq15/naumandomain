import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Package, ShoppingCart, TrendingUp, Settings } from "lucide-react";

const navigation = [
  { name: "Processed Orders", href: "/processed-orders", icon: Package },
  { name: "Profit Calculator", href: "/profit-calculator", icon: TrendingUp },
  { name: "Page 3", href: "/page-3", icon: ShoppingCart },
  { name: "Page 4", href: "/page-4", icon: Settings },
];

export function Navigation() {
  const location = useLocation();

  return (
    <nav className="flex space-x-8">
      {navigation.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              location.pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}