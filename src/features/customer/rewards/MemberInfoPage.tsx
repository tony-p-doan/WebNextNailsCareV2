import {useNavigate} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {RewardsStoreSelectPage} from "./RewardsStoreSelectPage";

export function MemberInfoPage() {
  const navigate = useNavigate();
  return (
    <>
      <AppBar title="Member Benefits" backTo="/customer" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 640}}>
          <div className="nnc-card">
            <h2 style={{marginTop: 0}}>Gold Member</h2>
            <p className="empty-text" style={{textAlign: "left"}}>
              Gold Members can earn rewards points from participating stores and redeem eligible rewards based on each store&apos;s rewards program.
            </p>
            <h2>Platinum Member</h2>
            <p className="empty-text" style={{textAlign: "left"}}>
              Stores can configure how many appointments are required within 12 months to earn Platinum status. Platinum status lasts one year. To keep Platinum for another year, the same number of appointments must be completed again during the next 12-month period.
            </p>
            <p className="empty-text" style={{textAlign: "left"}}>
              Platinum Members receive Gold benefits plus the store&apos;s Platinum Special Offering when that store has one enabled.
            </p>
            <button className="btn btn--primary-full" onClick={() => navigate("/customer/rewards")}>
              Search Store Rewards
            </button>
          </div>
          <p className="nnc-label">Search specific stores</p>
          <RewardsStoreSelectPage embedded />
        </main>
      </div>
    </>
  );
}
