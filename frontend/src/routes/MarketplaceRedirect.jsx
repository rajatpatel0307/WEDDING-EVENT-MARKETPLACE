import { Navigate, useLocation } from "react-router-dom";
import { marketplaceDestination } from "./marketplaceNavigation";

export default function MarketplaceRedirect() {
  return <Navigate to={marketplaceDestination(useLocation())} replace />;
}
