import { Navigate, Route, Routes } from "react-router-dom";
import { CustomerShell } from "../core/navigation/CustomerShell";
import { MerchantShell } from "../core/navigation/MerchantShell";
import { ProviderShell } from "../core/navigation/ProviderShell";

export function RootRouter() {
  // TODO: determine role from auth/user profile and route accordingly.
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/customer" replace />} />
      <Route path="/customer/*" element={<CustomerShell />} />
      <Route path="/merchant/*" element={<MerchantShell />} />
      <Route path="/provider/*" element={<ProviderShell />} />
    </Routes>
  );
}
