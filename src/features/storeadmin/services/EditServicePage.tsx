import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {getService, updateService} from "../../../data/store/storeApi";
import {getActiveStoreId} from "../storeAdminContext";

export function EditServicePage() {
  const {serviceId} = useParams<{serviceId: string}>();
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

  useEffect(() => {
    if (!storeId || !serviceId) return;
    getService(storeId, serviceId).then((svc) => {
      if (svc) {
        setIcon(svc.icon);
        setTitle(svc.title);
        setDescription(svc.description);
        setDurationMinutes(svc.durationMinutes != null ? String(svc.durationMinutes) : "");
        setPriceDollars(svc.priceCents != null ? (svc.priceCents / 100).toFixed(2) : "");
        setRewardsPoints(String(svc.rewardsPoints ?? 0));
        setIsActive(svc.isActive);
      }
    });
  }, [storeId, serviceId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId || !serviceId) return;
    setLoading(true);
    try {
      const dollarAmount = priceDollars ? parseFloat(priceDollars) : null;
      const cents = dollarAmount != null ? Math.round(dollarAmount * 100) : null;
      await updateService(
        storeId,
        serviceId,
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
      <AppBar title="Edit Service" backTo="/store-admin/services" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem"}}>
          <div className="form-card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Icon (emoji)</label>
                <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Title *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Duration (minutes)</label>
                <input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Price ($)</label>
                <input type="number" min={0} step="0.01" value={priceDollars} onChange={(e) => setPriceDollars(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Rewards Points Earned</label>
                <input type="number" min={0} value={rewardsPoints} onChange={(e) => setRewardsPoints(e.target.value)} />
              </div>
              <div className="form-group">
                <label style={{display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer"}}>
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  Active (offered to customers)
                </label>
              </div>
              <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                {loading ? "Saving…" : "Update Service"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
