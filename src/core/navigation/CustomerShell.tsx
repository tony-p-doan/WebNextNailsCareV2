import { Route, Routes } from "react-router-dom";
import { CustomerDashboardPage } from "../../features/customer/dashboard/CustomerDashboardPage";
import { ShopSearchPage } from "../../features/customer/search/ShopSearchPage";

export function CustomerShell() {
  return (
    <Routes>
      <Route path="/" element={<CustomerDashboardPage />} />
      <Route path="search" element={<ShopSearchPage />} />
    </Routes>
  );
}
