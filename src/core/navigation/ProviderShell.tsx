import { Route, Routes } from "react-router-dom";
import { ProviderDashboardPage } from "../../features/provider/dashboard/ProviderDashboardPage";

export function ProviderShell() {
  return (
    <Routes>
      <Route path="/" element={<ProviderDashboardPage />} />
    </Routes>
  );
}
