import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {listRewards, updateReward} from "../../../data/rewardsApi";
import {listServices} from "../../../data/store/storeApi";
import {serviceIsComplete} from "../../../domain/models/Store";
import type {Service} from "../../../domain/models/Store";
import {getActiveStoreId} from "../storeAdminContext";

export function EditRewardPage() {
  const {rewardId = ""} = useParams<{rewardId: string}>();
  const storeId = getActiveStoreId();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!storeId || !rewardId) return;
    Promise.all([
      listRewards(storeId),
      listServices(storeId),
    ]).then(([rewards, svcs]) => {
      const r = rewards.find((x) => x.id === rewardId);
      if (r) {
        setName(r.rewardName);
        setDescription(r.rewardDescription);
        setPoints(String(r.pointsRequired));
        setServiceId(r.serviceId);
      }
      setServices(svcs.filter((s) => serviceIsComplete(s)));
      setLoading(false);
    });
  }, [storeId, rewardId]);

  async function handleSave() {
    if (!storeId) return;
    if (!name.trim()) { setError("Reward name is required."); return; }
    const p = parseInt(points, 10);
    if (isNaN(p) || p <= 0) { setError("Points required must be a positive number."); return; }
    setSaving(true);
    setError(null);
    await updateReward(storeId, rewardId, {
      rewardName: name.trim(),
      rewardDescription: description.trim(),
      pointsRequired: p,
      serviceId,
    });
    navigate("/store-admin/rewards");
  }

  if (!storeId) return null;

  return (
    <>
      <AppBar title="Edit Reward" backTo="/store-admin/rewards" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem"}}>
          {loading ? (
            <p className="loading-text">Loading…</p>
          ) : (
            <div className="form-card">
              <div className="form-group">
                <label>Reward Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Points Required</label>
                <input type="number" min={1} value={points} onChange={(e) => setPoints(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Applies to Service (optional)</label>
                <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                  <option value="">— Any service —</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.icon} {s.title}</option>
                  ))}
                </select>
              </div>
              {error && <p className="error-message">{error}</p>}
              <button className="btn btn--primary btn--full" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
