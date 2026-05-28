import {useEffect, useState} from "react";
import {AppBar} from "../../../core/ui/AppBar";
import {FunctionsClient} from "../../../data/functions/FunctionsClient";
import {getRewardStatusSettings} from "../../../data/rewardSettingsApi";
import {getActiveStoreId} from "../storeAdminContext";

export function RewardsStatusPage() {
  const storeId = getActiveStoreId();
  const [required, setRequired] = useState("0");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    getRewardStatusSettings(storeId).then((s) => {
      setRequired(String(s.platinumAppointmentsRequired));
    });
  }, [storeId]);

  async function save() {
    if (!storeId) return;
    setSaving(true);
    setSaved(false);
    await FunctionsClient.setRewardStatusSettings(
      storeId,
      Math.max(0, Number.parseInt(required, 10) || 0)
    );
    setSaving(false);
    setSaved(true);
  }

  return (
    <>
      <AppBar title="Rewards Status" backTo="/store-admin" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 640}}>
          <div className="nnc-card form-card">
            <h2 style={{marginTop: 0}}>Gold and Platinum Membership</h2>
            <p className="empty-text" style={{textAlign: "left"}}>
              Every registered customer starts as a Gold Member for your store.
              Set how many booked appointments are required before they become a
              Platinum Member.
            </p>
            <label>Appointments Required for Platinum</label>
            <input
              type="number"
              min={0}
              value={required}
              onChange={(e) => setRequired(e.target.value)}
            />
            <button className="btn btn--primary" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Rewards Status"}
            </button>
            {saved && <p className="success-text">Rewards status setting saved.</p>}
          </div>
        </main>
      </div>
    </>
  );
}
