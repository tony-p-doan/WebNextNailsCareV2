import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {listAllStores} from "../../../data/store/storeApi";
import type {Store} from "../../../domain/models/Store";

/**
 * Superadmin landing page that lists every store on the platform. Selecting a
 * row navigates to that store's Stripe transaction history.
 */
export function SuperAdminTransactionStoreListPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const all = await listAllStores();
        const visible = all
          .filter((s) => s.status !== "deleted")
          .sort((a, b) =>
            (a.businessName || "").localeCompare(b.businessName || "")
          );
        setStores(visible);
      } catch (e) {
        console.error("Failed to load stores", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const q = filter.trim().toLowerCase();
  const visible = q
    ? stores.filter((s) =>
      (s.businessName || "").toLowerCase().includes(q) ||
        (s.address || "").toLowerCase().includes(q)
    )
    : stores;

  return (
    <>
      <AppBar title="Transaction History" backHistory />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 700}}>
          <div className="welcome-banner" style={{marginBottom: "1rem"}}>
            <h2 className="welcome-banner__greeting">Transaction History</h2>
            <p className="welcome-banner__sub">
              Pick a store to see its Stripe payment history.
            </p>
          </div>

          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by name or address…"
            style={{
              width: "100%",
              padding: "0.6rem 0.85rem",
              borderRadius: "var(--radius-sm)",
              border: "1.5px solid #d1d5db",
              fontSize: "0.95rem",
              marginBottom: "1rem",
              boxSizing: "border-box",
            }}
          />

          {loading ? (
            <p className="loading-text">Loading stores…</p>
          ) : visible.length === 0 ? (
            <p className="loading-text">No stores match.</p>
          ) : (
            visible.map((store) => (
              <Link
                key={store.id}
                to={`/super-admin/transactions/${store.id}`}
                className="action-card"
                style={{marginBottom: "0.6rem"}}
              >
                <div
                  className="action-card__icon-wrap"
                  style={{
                    background: store.isEnabled
                      ? "linear-gradient(135deg,#a78bfa,#7c3aed)"
                      : "linear-gradient(135deg,#9ca3af,#6b7280)",
                  }}
                >
                  💳
                </div>
                <div className="action-card__body">
                  <p className="action-card__title">
                    {store.businessName || "(Unnamed store)"}
                  </p>
                  <p className="action-card__subtitle">
                    {store.address || "No address"}
                    {!store.isEnabled && " · Disabled"}
                  </p>
                </div>
                <span className="action-card__chevron">›</span>
              </Link>
            ))
          )}
        </main>
      </div>
    </>
  );
}
