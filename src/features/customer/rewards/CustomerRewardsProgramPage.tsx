import {useEffect, useMemo, useState} from "react";
import {Link, useParams} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {useAuth} from "../../../core/auth/AuthContext";
import {FunctionsClient, type CustomerRewardsProgramStore} from "../../../data/functions/FunctionsClient";
import {getStore} from "../../../data/store/storeApi";
import {listRewards} from "../../../data/rewardsApi";
import {listSpecialOffers} from "../../../data/specialOffersApi";
import {getRewardStatusSettings} from "../../../data/rewardSettingsApi";
import {getCustomerStoreAppointmentCountLast12Months} from "../../../data/appointmentApi";
import {getMonthlyAwardSettings, listPublishedMonthlyAwards} from "../../../data/monthlyAwardsApi";
import type {MonthlyAward, MonthlyAwardSettings} from "../../../domain/models/MonthlyAward";

const REWARD_GRADIENTS = [
  "linear-gradient(135deg,#fcd34d,#f59e0b)",
  "linear-gradient(135deg,#6ee7b7,#10b981)",
  "linear-gradient(135deg,#a78bfa,#7c3aed)",
  "linear-gradient(135deg,#f9a8d4,#ec4899)",
  "linear-gradient(135deg,#6ee7f7,#3b82f6)",
];

export function CustomerRewardsProgramPage() {
  const {storeId = ""} = useParams<{storeId: string}>();
  const {profile, user} = useAuth();
  const [store, setStore] = useState<CustomerRewardsProgramStore | null>(null);
  const [awards, setAwards] = useState<MonthlyAward[]>([]);
  const [awardSettings, setAwardSettings] = useState<MonthlyAwardSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const userPoints = profile?.role === "customer" ? (store?.points ?? 0) : 0;
  const allItems = useMemo(() => {
    if (!store) return [];
    return [
      ...store.rewards.map((r) => ({...r, itemType: "reward" as const})),
      ...store.specialOffers.map((o) => ({
        ...o,
        memberTier: "platinum" as const,
        isIncludedForMember: store.tier === "platinum",
        itemType: "specialOffer" as const,
      })),
    ];
  }, [store]);

  useEffect(() => {
    if (!storeId) return;
    let active = true;
    setLoading(true);
    (async () => {
      const existing = await FunctionsClient.getCustomerRewardsProgram()
        .then((program) => program.stores.find((s) => s.storeId === storeId) ?? null)
        .catch(() => null);
      if (existing) return existing;
      const [storeDoc, rewards, offers, settings, monthlyAwards, monthlyAwardSettings] = await Promise.all([
        getStore(storeId),
        listRewards(storeId),
        listSpecialOffers(storeId),
        getRewardStatusSettings(storeId),
        listPublishedMonthlyAwards(storeId).catch(() => []),
        getMonthlyAwardSettings(storeId).catch(() => null),
      ]);
      if (active) {
        setAwards(monthlyAwards);
        setAwardSettings(monthlyAwardSettings);
      }
      const appointmentCount = profile?.role === "customer" && user?.uid
        ? await getCustomerStoreAppointmentCountLast12Months(user.uid, storeId).catch(() => 0)
        : 0;
      const required = settings.platinumAppointmentsRequired;
      const tier = required > 0 && appointmentCount >= required ? "platinum" : "gold";
      return {
        storeId,
        storeName: storeDoc?.businessName ?? "Store",
        points: 0,
        tier,
        appointmentCount,
        platinumAppointmentsRequired: required,
        appointmentsUntilPlatinum: tier === "platinum" || required <= 0 ? 0 : Math.max(required - appointmentCount, 0),
        rewards: rewards.map((r) => ({
          id: r.id,
          type: "reward" as const,
          title: r.rewardName,
          description: r.rewardDescription,
          pointsRequired: r.pointsRequired,
          isEnabled: true,
        })),
        specialOffers: offers.filter((o) => o.isEnabled).map((o) => ({
          id: o.id,
          type: "specialOffer" as const,
          title: o.title,
          description: o.description,
          dollarValueCents: o.dollarValueCents,
          memberTier: "platinum" as const,
          pointsRequired: o.pointsRequired,
          isIncludedForMember: tier === "platinum",
        })),
      } satisfies CustomerRewardsProgramStore;
    })()
      .then((programStore) => { if (active) setStore(programStore); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [storeId, profile, user]);

  return (
    <>
      <AppBar title="Rewards Program" backTo="/customer/rewards" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 640}}>
          {loading ? (
            <p className="loading-text">Loading rewards…</p>
          ) : (
            <>
              {/* Store header */}
              <div className="nnc-card" style={{display: "flex", alignItems: "center", gap: "0.875rem", padding: "1rem 1.25rem"}}>
                <div className="icon-circle" style={{background: "linear-gradient(135deg,#fcd34d,#f59e0b)"}}>🏪</div>
                <div style={{flex: 1}}>
                  <p style={{margin: 0, fontWeight: 700, fontSize: "1.05rem", color: "var(--color-text)"}}>{store?.storeName ?? "Store"}</p>
                  {profile?.role === "customer" && (
                    <p style={{margin: "0.15rem 0 0", fontSize: "0.85rem", color: "var(--color-primary)", fontWeight: 600}}>
                      {store?.tier === "platinum" ? "🏆 Platinum Member" : "🥇 Gold Member"} · {userPoints} pts
                    </p>
                  )}
                </div>
              </div>
              <div className="nnc-card" style={{padding: "1rem 1.25rem"}}>
                <h2 style={{margin: 0}}>Rewards Program</h2>
                <p className="empty-text" style={{textAlign: "left"}}>
                  Gold Members can earn reward points at this store and redeem
                  eligible rewards. Platinum Members receive every Gold offer
                  plus this store&apos;s Platinum Special Offer.
                </p>
                <p className="nnc-list-row__sub">
                  Appointments at this store: {store?.appointmentCount ?? 0}
                  {store && store.tier !== "platinum" && store.platinumAppointmentsRequired > 0
                    ? ` · ${store.appointmentsUntilPlatinum} more until Platinum`
                    : ""}
                </p>
                {store && store.platinumAppointmentsRequired > 0 ? (
                  <p className="nnc-list-row__sub">
                    Make {store.platinumAppointmentsRequired} appointments within 12 months to earn Platinum.
                    Platinum status lasts one year, and the same number of appointments is required to renew it for another year.
                  </p>
                ) : (
                  <p className="nnc-list-row__sub">
                    This store has not configured the number of appointments required for Platinum status yet.
                  </p>
                )}
              </div>

              <p className="nnc-label" style={{marginTop: "0.25rem"}}>Available Rewards and Special Offers</p>
              {awards.length > 0 && (
                <>
                  <p className="nnc-label" style={{marginTop: "0.25rem"}}>Monthly Recognition</p>
                  {awards
                    .filter((award) => award.kind === "customer" ? awardSettings?.customerOfMonthEnabled !== false : awardSettings?.employeeOfMonthEnabled !== false)
                    .map((award) => (
                      <div key={award.id} className="nnc-list-row" style={{cursor: "default"}}>
                        <div className="icon-circle" style={{background: award.kind === "customer" ? "linear-gradient(135deg,#fcd34d,#f59e0b)" : "linear-gradient(135deg,#6ee7b7,#10b981)"}}>
                          ★
                        </div>
                        <div className="nnc-list-row__body">
                          <p className="nnc-list-row__title">
                            {award.kind === "customer" ? "Customer" : "Employee"} of the Month: {award.displayName}
                          </p>
                          <p className="nnc-list-row__sub">{award.reason}</p>
                          {award.kind === "customer" && award.rewardPoints > 0 && (
                            <span className="badge badge--primary">{award.rewardPoints} pts reward</span>
                          )}
                        </div>
                      </div>
                    ))}
                </>
              )}
              {allItems.length === 0 ? (
                <p className="empty-text">This store has no rewards program yet.</p>
              ) : (
                allItems.map((r, idx) => {
                  const eligible = userPoints >= r.pointsRequired && (r.itemType === "reward" || r.isIncludedForMember);
                  return (
                    <div key={r.id} className="nnc-list-row" style={{cursor: "default"}}>
                      <div
                        className="icon-circle"
                        style={{background: REWARD_GRADIENTS[idx % REWARD_GRADIENTS.length]}}
                      >
                        ⭐
                      </div>
                      <div className="nnc-list-row__body">
                        <p className="nnc-list-row__title">{r.title}</p>
                        <p className="nnc-list-row__sub">{r.description}</p>
                        <span
                          className={`badge ${eligible ? "badge--success" : "badge--primary"}`}
                          style={{marginTop: "0.3rem", display: "inline-block"}}
                        >
                          {r.itemType === "specialOffer" ? "Platinum Special Offer · " : ""}
                          {r.pointsRequired} pts required{eligible ? " ✓ Eligible" : ""}
                        </span>
                        {eligible && (
                          <Link
                            className="btn btn--outline"
                            style={{marginTop: "0.5rem"}}
                            to={`/customer/rewards/${storeId}/redeem?type=${r.itemType}&itemId=${r.id}`}
                          >
                            Redeem Reward
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
