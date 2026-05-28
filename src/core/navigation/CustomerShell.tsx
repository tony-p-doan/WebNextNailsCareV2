import {Route, Routes} from "react-router-dom";
import {DashboardPage} from "../../features/customer/dashboard/DashboardPage";
import {CustomerRegistrationPage} from "../../features/customer/register/CustomerRegistrationPage";
import {AccountPage} from "../../features/customer/account/AccountPage";
import {SearchStorePage} from "../../features/customer/booking/SearchStorePage";
import {SelectServicePage} from "../../features/customer/booking/SelectServicePage";
import {SelectDatePage} from "../../features/customer/booking/SelectDatePage";
import {SelectTimePage} from "../../features/customer/booking/SelectTimePage";
import {SelectProviderPage} from "../../features/customer/booking/SelectProviderPage";
import {
  BookByProviderSelectDatePage,
  BookByProviderSelectProviderPage,
  BookByProviderSelectServicePage,
  BookByProviderSelectTimePage,
} from "../../features/customer/booking/BookByProviderPages";
import {BookByAIPage} from "../../features/customer/booking/BookByAIPage";
import {BookingSummaryPage} from "../../features/customer/booking/BookingSummaryPage";
import {RewardsStoreSelectPage} from "../../features/customer/rewards/RewardsStoreSelectPage";
import {CustomerRewardsProgramPage} from "../../features/customer/rewards/CustomerRewardsProgramPage";
import {MemberInfoPage} from "../../features/customer/rewards/MemberInfoPage";
import {RedeemRewardPage} from "../../features/customer/rewards/RedeemRewardPage";
import {BookingProvider} from "../../features/customer/booking/BookingContext";

export function CustomerShell() {
  return (
    <BookingProvider>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="register" element={<CustomerRegistrationPage />} />
        {/* Booking flow */}
        <Route path="search" element={<SearchStorePage />} />
        <Route path="book-by-ai" element={<BookByAIPage />} />
        <Route path="book-by-provider" element={<SearchStorePage bookByProvider />} />
        <Route path="book-by-provider/:storeId/provider" element={<BookByProviderSelectProviderPage />} />
        <Route path="book-by-provider/:storeId/provider/:employeeId/service" element={<BookByProviderSelectServicePage />} />
        <Route path="book-by-provider/:storeId/provider/:employeeId/service/:serviceId/date" element={<BookByProviderSelectDatePage />} />
        <Route path="book-by-provider/:storeId/provider/:employeeId/service/:serviceId/date/:date/time" element={<BookByProviderSelectTimePage />} />
        <Route path="book-by-provider/:storeId/provider/:employeeId/service/:serviceId/special-request" element={<BookByProviderSelectTimePage specialRequest />} />
        <Route path="booking/:storeId/service" element={<SelectServicePage />} />
        <Route path="booking/:storeId/service/:serviceId/date" element={<SelectDatePage />} />
        <Route path="booking/:storeId/service/:serviceId/date/:date/time" element={<SelectTimePage />} />
        <Route path="booking/:storeId/service/:serviceId/date/:date/time/:timeSlot/provider" element={<SelectProviderPage />} />
        <Route path="booking/summary" element={<BookingSummaryPage />} />
        {/* Rewards */}
        <Route path="rewards" element={<RewardsStoreSelectPage />} />
        <Route path="member-info" element={<MemberInfoPage />} />
        <Route path="rewards/:storeId" element={<CustomerRewardsProgramPage />} />
        <Route path="rewards/:storeId/redeem" element={<RedeemRewardPage />} />
        {/* Account */}
        <Route path="account" element={<AccountPage />} />
      </Routes>
    </BookingProvider>
  );
}
