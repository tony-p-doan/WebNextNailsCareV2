import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {listRewards, deleteReward} from "../../../data/rewardsApi";
import type {RewardRule} from "../../../domain/models/RewardRule";
import {getActiveStoreId} from "../storeAdminContext";

const REWARD_GRADIENTS = [
  "linear-gradient(135deg,#fcd34d,#f59e0b)",
  "linear-gradient(135deg,#6ee7b7,#10b981)",
  "linear-gradient(135deg,#a78bfa,#7c3aed)",
  "linear-gradient(135deg,#f9a8d4,#ec4899)",
  "linear-gradient(135deg,#6ee7f7,#3b82f6)",
];

export function ManageRewardsPage() {
  const storeId = getActiveStoreId();
  const [rewards, setRewards] = useState<RewardRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    listRewards(storeId).then((r) => { setRewards(r); setLoading(false); });
  }, [storeId]);

  async function handleDelete(id: string) {
    if (!storeId) return;
    if (!confirm("Delete this reward?")) return;
    await deleteReward(storeId, id);
    setRewards((prev) => prev.filter((r) => r.id !== id));
  }

  if (!storeId) return null;

  return (
    <>
      <AppBar title="Manage Rewards" backTo="/store-admin" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 640}}>
          <p className="nnc-label">Reward Rules</p>
          {loading ? (
            <p className="loading-text">Loading rewards…</p>
          ) : rewards.length === 0 ? (
            <p className="empty-text">No reward rules yet. Add one below.</p>
          ) : (
            rewards.map((r, idx) => (
              <div key={r.id} className="nnc-list-row" style={{cursor: "default", flexWrap: "wrap", gap: "0.75rem"}}>
                <div
                  className="icon-circle"
                  style={{background: REWARD_GRADIENTS[idx % REWARD_GRADIENTS.length]}}
                >
                  ⭐
                </div>
                <div className="nnc-list-row__body">
                  <p className="nnc-list-row__title">{r.rewardName}</p>
                  <p className="nnc-list-row__sub">{r.rewardDescription}</p>
                  <p style={{margin: "0.2rem 0 0", fontSize: "0.8rem", color: "var(--color-primary)", fontWeight: 600}}>
                    {r.pointsRequired} pts required
                  </p>
                </div>
                <div style={{display: "flex", gap: "0.5rem", flexShrink: 0}}>
                  <Link to={`/store-admin/rewards/${r.id}`} className="btn btn--outline btn--sm">Edit</Link>
                  <button className="btn btn--danger btn--sm" onClick={() => handleDelete(r.id)}>Delete</button>
                </div>
              </div>
            ))
          )}
          <Link to="/store-admin/rewards/new" className="nnc-add-btn">
            + Add Reward
          </Link>
        </main>
      </div>
    </>
  );
}
