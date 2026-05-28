import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {searchStores} from "../../../data/store/storeApi";
import {useAuth} from "../../../core/auth/AuthContext";
import type {Store} from "../../../domain/models/Store";

const STORE_GRADIENTS = [
  "linear-gradient(135deg,#a78bfa,#7c3aed)",
  "linear-gradient(135deg,#fcd34d,#f59e0b)",
  "linear-gradient(135deg,#f9a8d4,#ec4899)",
  "linear-gradient(135deg,#6ee7b7,#10b981)",
  "linear-gradient(135deg,#6ee7f7,#3b82f6)",
];

export function RewardsStoreSelectPage({embedded = false}: {embedded?: boolean}) {
  const {signOut} = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    searchStores(query).then((r) => {
      if (active) { setStores(r); setLoading(false); }
    });
    return () => { active = false; };
  }, [query]);

  return (
    <>
      {!embedded && (
        <AppBar
          title="Rewards Programs"
          backTo="/customer"
          showLogout
          onLogout={async () => { await signOut(); navigate("/customer"); }}
        />
      )}
      <div className={embedded ? "" : "page-bg"}>
        <main className={embedded ? "" : "container"} style={embedded ? undefined : {paddingTop: "1.5rem", maxWidth: 640}}>
          <p className="nnc-label">Find a Salon's Rewards</p>
          <div className="search-wrap">
            <span className="search-wrap__icon">🔍</span>
            <input
              type="search"
              placeholder="Store name, address, or city…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          {loading ? (
            <p className="loading-text">Searching…</p>
          ) : stores.length === 0 ? (
            <p className="empty-text">
              {query ? "No stores found." : "Enter a store name above."}
            </p>
          ) : (
            stores.map((store, idx) => (
              <button
                key={store.id}
                className="store-card"
                onClick={() => navigate(`/customer/rewards/${store.id}`)}
              >
                <div
                  className="store-card__icon"
                  style={{background: STORE_GRADIENTS[idx % STORE_GRADIENTS.length]}}
                >
                  ⭐
                </div>
                <div className="store-card__body">
                  <p className="store-card__name">{store.businessName}</p>
                  {store.address && <p className="store-card__meta">📍 {store.address}</p>}
                </div>
                <span className="store-card__arrow">›</span>
              </button>
            ))
          )}
        </main>
      </div>
    </>
  );
}
