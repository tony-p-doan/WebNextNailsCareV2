import { Route, Routes } from "react-router-dom";
import { ProviderDashboardPage } from "../../features/provider/dashboard/ProviderDashboardPage";
import { ManageAppointmentsPage } from "../../features/provider/ManageAppointmentsPage";

export function ProviderShell() {
  return (
    <Routes>
      <Route path="/" element={<ProviderDashboardPage />} />
      <Route path="appointments" element={<ManageAppointmentsPage />} />
    </Routes>
  );
}
