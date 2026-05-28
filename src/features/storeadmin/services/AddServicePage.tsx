import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {addService} from "../../../data/store/storeApi";
import {getActiveStoreId} from "../storeAdminContext";

export function AddServicePage() {
  const [icon, setIcon] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [priceDollars, setPriceDollars] = useState("");
  const [rewardsPoints, setRewardsPoints] = useState("0");
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const storeId = getActiveStoreId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId) return;
    setLoading(true);
    try {
      const dollarAmount = priceDollars ? parseFloat(priceDollars) : null;
      const cents = dollarAmount != null ? Math.round(dollarAmount * 100) : null;
      await addService(
        storeId,
        icon,
        title.trim(),
        description.trim(),
        durationMinutes ? parseInt(durationMinutes, 10) : null,
        cents,
        parseInt(rewardsPoints, 10) || 0,
        isActive
      );
      navigate("/store-admin/services", {replace: true});
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AppBar title="Add Service" backTo="/store-admin/services" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem"}}>
          <div className="form-card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Icon (emoji)</label>
                <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="💅" />
              </div>
              <div className="form-group">
                <label>Title *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Classic Manicure" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description…" />
              </div>
              <div className="form-group">
                <label>Duration (minutes)</label>
                <input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="e.g. 60" />
              </div>
              <div className="form-group">
                <label>Price ($)</label>
                <input type="number" min={0} step="0.01" value={priceDollars} onChange={(e) => setPriceDollars(e.target.value)} placeholder="e.g. 35.00" />
              </div>
              <div className="form-group">
                <label>Rewards Points Earned</label>
                <input type="number" min={0} value={rewardsPoints} onChange={(e) => setRewardsPoints(e.target.value)} placeholder="e.g. 10" />
              </div>
              <div className="form-group">
                <label style={{display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer"}}>
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  Active (offered to customers)
                </label>
              </div>
              <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                {loading ? "Saving…" : "Add Service"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
