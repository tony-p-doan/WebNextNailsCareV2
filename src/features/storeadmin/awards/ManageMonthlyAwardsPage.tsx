import {useEffect, useMemo, useState} from "react";
import {AppBar} from "../../../core/ui/AppBar";
import {
  generateMonthlyAwardSuggestions,
  getMonthlyAwardSettings,
  listMonthlyAwards,
  setMonthlyAwardSettings,
  updateMonthlyAward,
} from "../../../data/monthlyAwardsApi";
import {listProviderRatings, moderateProviderRating} from "../../../data/providerRatingsApi";
import type {MonthlyAward} from "../../../domain/models/MonthlyAward";
import type {ProviderRating} from "../../../domain/models/ProviderRating";
import {getActiveStoreId} from "../storeAdminContext";

function thisMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function ManageMonthlyAwardsPage() {
  const storeId = getActiveStoreId();
  const [monthKey, setMonthKey] = useState(thisMonthKey());
  const [awards, setAwards] = useState<MonthlyAward[]>([]);
  const [ratings, setRatings] = useState<ProviderRating[]>([]);
  const [customerEnabled, setCustomerEnabled] = useState(true);
  const [employeeEnabled, setEmployeeEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [year, month] = useMemo(() => monthKey.split("-").map(Number), [monthKey]);

  async function reload() {
    if (!storeId) return;
    setLoading(true);
    const [settings, awardRows, ratingRows] = await Promise.all([
      getMonthlyAwardSettings(storeId),
      listMonthlyAwards(storeId, monthKey),
      listProviderRatings(storeId),
    ]);
    setCustomerEnabled(settings.customerOfMonthEnabled);
    setEmployeeEnabled(settings.employeeOfMonthEnabled);
    setAwards(awardRows);
    setRatings(ratingRows);
    setLoading(false);
  }

  useEffect(() => {
    reload().catch(() => setLoading(false));
  }, [storeId, monthKey]);

  async function toggle(kind: "customer" | "employee", value: boolean) {
    if (!storeId) return;
    if (kind === "customer") setCustomerEnabled(value);
    else setEmployeeEnabled(value);
    await setMonthlyAwardSettings(storeId, {
      customerOfMonthEnabled: kind === "customer" ? value : undefined,
      employeeOfMonthEnabled: kind === "employee" ? value : undefined,
    });
  }

  async function suggest(kind: "customer" | "employee") {
    if (!storeId) return;
    setWorking(true);
    await generateMonthlyAwardSuggestions(storeId, kind, year, month);
    await reload();
    setWorking(false);
  }

  async function setStatus(award: MonthlyAward, status: MonthlyAward["status"]) {
    if (!storeId) return;
    await updateMonthlyAward(storeId, award.id, {status});
    await reload();
  }

  async function updatePoints(award: MonthlyAward, points: number) {
    if (!storeId) return;
    await updateMonthlyAward(storeId, award.id, {rewardPoints: points});
    setAwards((prev) => prev.map((item) => item.id === award.id ? {...item, rewardPoints: points} : item));
  }

  async function moderate(rating: ProviderRating, status: ProviderRating["status"]) {
    if (!storeId) return;
    await moderateProviderRating(storeId, rating.id, status);
    await reload();
  }

  if (!storeId) return null;

  return (
    <>
      <AppBar title="Awards and Ratings" backTo="/store-admin" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 760}}>
          <div className="nnc-card" style={{padding: "1rem 1.25rem"}}>
            <p className="nnc-label">Monthly Awards</p>
            <label className="form-field">
              <span>Month</span>
              <input type="month" value={monthKey} onChange={(e) => setMonthKey(e.target.value)} />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={customerEnabled} onChange={(e) => toggle("customer", e.target.checked)} />
              <span>Customer of the Month enabled</span>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={employeeEnabled} onChange={(e) => toggle("employee", e.target.checked)} />
              <span>Employee of the Month enabled</span>
            </label>
            <div style={{display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem"}}>
              <button className="btn btn--outline" disabled={working} onClick={() => suggest("customer")}>Suggest Customers</button>
              <button className="btn btn--outline" disabled={working} onClick={() => suggest("employee")}>Suggest Employees</button>
            </div>
          </div>

          <p className="nnc-label" style={{marginTop: "1rem"}}>Candidates</p>
          {loading ? <p className="loading-text">Loading…</p> : awards.length === 0 ? (
            <p className="empty-text">No candidates yet.</p>
          ) : awards.map((award) => (
            <div className="nnc-list-row" key={award.id} style={{cursor: "default", alignItems: "flex-start"}}>
              <div className="icon-circle" style={{background: award.kind === "customer" ? "linear-gradient(135deg,#fcd34d,#f59e0b)" : "linear-gradient(135deg,#6ee7b7,#10b981)"}}>
                {award.kind === "customer" ? "★" : "✓"}
              </div>
              <div className="nnc-list-row__body">
                <p className="nnc-list-row__title">{award.displayName}</p>
                <p className="nnc-list-row__sub">{award.kind === "customer" ? "Customer" : "Employee"} · {award.status}</p>
                <p className="nnc-list-row__sub">{award.reason}</p>
                {award.kind === "customer" && (
                  <label className="form-field" style={{marginTop: "0.5rem"}}>
                    <span>Reward points admin will grant</span>
                    <input type="number" value={award.rewardPoints} onChange={(e) => updatePoints(award, Number(e.target.value) || 0)} />
                  </label>
                )}
              </div>
              <div style={{display: "flex", gap: "0.5rem", flexWrap: "wrap"}}>
                <button className="btn btn--sm btn--primary" onClick={() => setStatus(award, "published")}>Publish</button>
                <button className="btn btn--sm btn--outline" onClick={() => setStatus(award, "draft")}>Draft</button>
                <button className="btn btn--sm btn--danger" onClick={() => setStatus(award, "archived")}>Archive</button>
              </div>
            </div>
          ))}

          <p className="nnc-label" style={{marginTop: "1rem"}}>Provider Ratings</p>
          {ratings.length === 0 ? <p className="empty-text">No provider ratings yet.</p> : ratings.map((rating) => (
            <div className="nnc-list-row" key={rating.id} style={{cursor: "default", alignItems: "flex-start"}}>
              <div className="icon-circle" style={{background: "linear-gradient(135deg,#6ee7f7,#3b82f6)"}}>{rating.rating}</div>
              <div className="nnc-list-row__body">
                <p className="nnc-list-row__title">{rating.providerName}</p>
                <p className="nnc-list-row__sub">{rating.customerName} · {rating.status}</p>
                {rating.comment && <p className="nnc-list-row__sub">{rating.comment}</p>}
                {rating.privateFeedback && <p className="nnc-list-row__sub">Private: {rating.privateFeedback}</p>}
              </div>
              <div style={{display: "flex", gap: "0.5rem", flexWrap: "wrap"}}>
                <button className="btn btn--sm btn--primary" onClick={() => moderate(rating, "published")}>Approve</button>
                <button className="btn btn--sm btn--outline" onClick={() => moderate(rating, "hidden")}>Hide</button>
                <button className="btn btn--sm btn--danger" onClick={() => moderate(rating, "flagged")}>Flag</button>
              </div>
            </div>
          ))}
        </main>
      </div>
    </>
  );
}
