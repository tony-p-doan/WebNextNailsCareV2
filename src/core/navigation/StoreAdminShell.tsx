import {Route, Routes} from "react-router-dom";
import {StoreManagementPage} from "../../features/storeadmin/StoreManagementPage";
import {ManageEmployeesPage} from "../../features/storeadmin/employees/ManageEmployeesPage";
import {AddEmployeePage} from "../../features/storeadmin/employees/AddEmployeePage";
import {EditEmployeePage} from "../../features/storeadmin/employees/EditEmployeePage";
import {EmployeeSchedulePage} from "../../features/storeadmin/schedules/EmployeeSchedulePage";
import {ManageSchedulesPage} from "../../features/storeadmin/schedules/ManageSchedulesPage";
import {ManageServicesPage} from "../../features/storeadmin/services/ManageServicesPage";
import {AddServicePage} from "../../features/storeadmin/services/AddServicePage";
import {EditServicePage} from "../../features/storeadmin/services/EditServicePage";
import {ManageRewardsPage} from "../../features/storeadmin/rewards/ManageRewardsPage";
import {AddRewardPage} from "../../features/storeadmin/rewards/AddRewardPage";
import {EditRewardPage} from "../../features/storeadmin/rewards/EditRewardPage";
import {RewardsStatusPage} from "../../features/storeadmin/rewards/RewardsStatusPage";
import {RedeemRewardScannerPage} from "../../features/storeadmin/rewards/RedeemRewardScannerPage";
import {ManageSpecialOffersPage} from "../../features/storeadmin/specialOffers/ManageSpecialOffersPage";
import {AddSpecialOfferPage} from "../../features/storeadmin/specialOffers/AddSpecialOfferPage";
import {EditSpecialOfferPage} from "../../features/storeadmin/specialOffers/EditSpecialOfferPage";
import {StoreCalendarPage} from "../../features/storeadmin/calendar/StoreCalendarPage";
import {ManageAccountPage} from "../../features/storeadmin/account/ManageAccountPage";
import {ManageAdminsPage} from "../../features/storeadmin/admins/ManageAdminsPage";
import {SharedExperiencesPage} from "../../features/storeadmin/share/SharedExperiencesPage";
import {ReportsPage} from "../../features/storeadmin/reports/ReportsPage";
import {ManageMonthlyAwardsPage} from "../../features/storeadmin/awards/ManageMonthlyAwardsPage";

export function StoreAdminShell() {
  return (
    <Routes>
      <Route path="/" element={<StoreManagementPage />} />
      <Route path="employees" element={<ManageEmployeesPage />} />
      <Route path="employees/new" element={<AddEmployeePage />} />
      <Route path="employees/:employeeId" element={<EditEmployeePage />} />
      <Route path="schedules" element={<ManageSchedulesPage />} />
      <Route path="schedules/employee/:employeeId" element={<EmployeeSchedulePage />} />
      <Route path="services" element={<ManageServicesPage />} />
      <Route path="services/new" element={<AddServicePage />} />
      <Route path="services/:serviceId" element={<EditServicePage />} />
      <Route path="rewards" element={<ManageRewardsPage />} />
      <Route path="rewards/new" element={<AddRewardPage />} />
      <Route path="rewards/:rewardId" element={<EditRewardPage />} />
      <Route path="rewards-status" element={<RewardsStatusPage />} />
      <Route path="redeem-reward" element={<RedeemRewardScannerPage />} />
      <Route path="special-offers" element={<ManageSpecialOffersPage />} />
      <Route path="special-offers/new" element={<AddSpecialOfferPage />} />
      <Route path="special-offers/:offerId" element={<EditSpecialOfferPage />} />
      <Route path="calendar" element={<StoreCalendarPage />} />
      <Route path="account" element={<ManageAccountPage />} />
      <Route path="admins" element={<ManageAdminsPage />} />
      <Route path="admins/:storeId" element={<ManageAdminsPage />} />
      <Route path="share-experience" element={<SharedExperiencesPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="awards" element={<ManageMonthlyAwardsPage />} />
    </Routes>
  );
}
