import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {useBooking} from "./BookingContext";
import {searchStores} from "../../../data/store/storeApi";
import type {Store} from "../../../domain/models/Store";
import {fullAddress, mapsUrl} from "../../../domain/models/Store";
import {useAuth} from "../../../core/auth/AuthContext";

export function SearchStorePage({bookByProvider = false}: {bookByProvider?: boolean}) {
  const {signOut} = useAuth();
  const [query, setQuery] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const {setSelectedStore} = useBooking();

  useEffect(() => {
    let active = true;
    setLoading(true);
    searchStores(query).then((results) => {
      if (active) { setStores(results); setLoading(false); }
    });
    return () => { active = false; };
  }, [query]);

  function handleSelectStore(store: Store) {
    setSelectedStore(store);
    if (bookByProvider) {
      navigate(`/customer/book-by-provider/${store.id}/provider`);
      return;
    }
    navigate(`/customer/booking/${store.id}/service`);
  }

  return (
    <>
      <AppBar
        title={bookByProvider ? "Select Store" : "Search for a Store"}
        backTo="/customer"
        showLogout
        onLogout={async () => { await signOut(); navigate("/customer"); }}
      />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 640}}>
          <p className="nnc-label">{bookByProvider ? "Book by Provider" : "Find a Salon"}</p>
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
              {query ? "No stores found. Try a different search." : "Enter a store name or location above."}
            </p>
          ) : (
            stores.map((store) => (
              <button
                key={store.id}
                className="store-card"
                onClick={() => handleSelectStore(store)}
              >
                <div className="store-card__icon">🏪</div>
                <div className="store-card__body">
                  <p className="store-card__name">
                    {store.businessName}
                    {store.isDemoStore && (
                      <span style={{
                        marginLeft: "0.5rem",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        background: "linear-gradient(135deg,#fcd34d,#f59e0b)",
                        color: "#fff",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "999px",
                        verticalAlign: "middle",
                        letterSpacing: "0.05em",
                      }}>DEMO</span>
                    )}
                  </p>
                  {fullAddress(store) && (
                    <p className="store-card__meta">
                      📍{" "}
                      <a
                        href={mapsUrl(store)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{color: "var(--color-primary)", textDecoration: "underline"}}
                      >
                        {fullAddress(store)}
                      </a>
                    </p>
                  )}
                  {store.phone && <p className="store-card__meta">📞 {store.phone}</p>}
                  {store.isDemoStore && (
                    <p className="store-card__meta" style={{color: "var(--color-primary)", fontWeight: 600}}>
                      ✨ Demo store — all services & times available
                    </p>
                  )}
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
