import {Route, Routes} from "react-router-dom";
import {SuperAdminDashboardPage} from "../../features/superadmin/SuperAdminDashboardPage";
import {SuperAdminStoreListPage} from "../../features/superadmin/stores/SuperAdminStoreListPage";
import {CustomerMessagingPage} from "../../features/superadmin/messaging/CustomerMessagingPage";
import {SuperAdminTransactionStoreListPage} from "../../features/superadmin/transactions/SuperAdminTransactionStoreListPage";
import {SuperAdminStoreTransactionsPage} from "../../features/superadmin/transactions/SuperAdminStoreTransactionsPage";

export function SuperAdminShell() {
  return (
    <Routes>
      <Route path="/" element={<SuperAdminDashboardPage />} />
      <Route path="stores" element={<SuperAdminStoreListPage />} />
      <Route path="messaging" element={<CustomerMessagingPage />} />
      <Route path="transactions" element={<SuperAdminTransactionStoreListPage />} />
      <Route path="transactions/:storeId" element={<SuperAdminStoreTransactionsPage />} />
    </Routes>
  );
}
