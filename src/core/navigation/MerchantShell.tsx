import { Route, Routes } from "react-router-dom";
import { MerchantDashboardPage } from "../../features/merchant/dashboard/MerchantDashboardPage";

export function MerchantShell() {
  return (
    <Routes>
      <Route path="/" element={<MerchantDashboardPage />} />
    </Routes>
  );
}
