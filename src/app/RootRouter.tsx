import {Navigate, Route, Routes} from "react-router-dom";
import {CustomerShell} from "../core/navigation/CustomerShell";
import {MerchantShell} from "../core/navigation/MerchantShell";
import {ProviderShell} from "../core/navigation/ProviderShell";
import {StoreAdminShell} from "../core/navigation/StoreAdminShell";
import {SuperAdminShell} from "../core/navigation/SuperAdminShell";
import {SuperAdminGuard} from "../core/navigation/SuperAdminGuard";
import {LoginPage} from "../features/auth/LoginPage";
import {PromoVideoPage} from "../features/public/PromoVideoPage";
import {ExperienceSharePage} from "../features/public/ExperienceSharePage";
import {ResetPasswordPage} from "../features/auth/ResetPasswordPage";
import {StoreAdminRegistrationPage} from "../features/storeadmin/register/StoreAdminRegistrationPage";
import {EmployeeRegistrationPage} from "../features/employee/EmployeeRegistrationPage";

export function RootRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/customer" replace />} />
      <Route path="/customer/*" element={<CustomerShell />} />
      <Route path="/store-admin/register" element={<StoreAdminRegistrationPage />} />
      <Route path="/employee/register" element={<EmployeeRegistrationPage />} />
      <Route path="/store-admin/*" element={<StoreAdminShell />} />
      <Route
        path="/super-admin/*"
        element={
          <SuperAdminGuard>
            <SuperAdminShell />
          </SuperAdminGuard>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/promo-demo" element={<PromoVideoPage />} />
      <Route path="/experience/:shareId" element={<ExperienceSharePage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/merchant/*" element={<MerchantShell />} />
      <Route path="/provider/*" element={<ProviderShell />} />
    </Routes>
  );
}
