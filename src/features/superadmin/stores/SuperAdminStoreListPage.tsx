import {useEffect, useState} from "react";
import {AppBar} from "../../../core/ui/AppBar";
import {
  listAllStores,
  setStoreEnabled,
  deleteStore,
  restoreStore,
} from "../../../data/store/storeApi";
import {getStoreAccount} from "../../../data/accountApi";
import type {Store} from "../../../domain/models/Store";

const DELETE_PASSCODE = "11233";

interface StoreRow {
  store: Store;
  lastPaymentDate: string | null;
  accountStatus: string | null;
}

type TabId = "active" | "inactive" | "paymentdue" | "deleted";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "None";
  const [y, mo, d] = dateStr.split("-");
  return new Date(Number(y), Number(mo) - 1, Number(d)).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function tabLabel(tab: TabId, rows: StoreRow[]): string {
  const count = filterRows(rows, tab).length;
  const labels: Record<TabId, string> = {
    active: "Active",
    inactive: "Inactive",
    paymentdue: "Payment Due",
    deleted: "Deleted",
  };
  return `${labels[tab]} (${count})`;
}

function filterRows(rows: StoreRow[], tab: TabId): StoreRow[] {
  return rows.filter(({store, lastPaymentDate, accountStatus}) => {
    const isDeleted = store.status === "deleted";
    if (tab === "deleted") return isDeleted;
    if (isDeleted) return false;
    switch (tab) {
    case "active":
      return store.isEnabled === true;
    case "inactive":
      return store.isEnabled === false;
    case "paymentdue":
      // Had a payment before but subscription is no longer active
      return lastPaymentDate !== null && accountStatus !== "active";
    }
  });
}

export function SuperAdminStoreListPage() {
  const [rows, setRows] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("active");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Delete flow
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stores = await listAllStores();
        const withAccounts = await Promise.all(
          stores.map(async (store) => {
            try {
              const acct = await getStoreAccount(store.id);
              return {
                store,
                lastPaymentDate: acct?.lastPaymentDate ?? null,
                accountStatus: acct?.status ?? null,
              };
            } catch {
              return {store, lastPaymentDate: null, accountStatus: null};
            }
          })
        );
        setRows(withAccounts);
      } catch (e) {
        console.error("Failed to load stores", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleToggle(storeId: string, current: boolean) {
    setTogglingId(storeId);
    const next = !current;
    setRows((prev) =>
      prev.map((r) =>
        r.store.id === storeId ? {...r, store: {...r.store, isEnabled: next}} : r
      )
    );
    try {
      await setStoreEnabled(storeId, next);
    } catch {
      setRows((prev) =>
        prev.map((r) =>
          r.store.id === storeId ? {...r, store: {...r.store, isEnabled: current}} : r
        )
      );
    }
    setTogglingId(null);
  }

  function openDeleteDialog(storeId: string) {
    setDeleteTargetId(storeId);
    setPasscode("");
    setPasscodeError(false);
  }

  function closeDeleteDialog() {
    setDeleteTargetId(null);
    setPasscode("");
    setPasscodeError(false);
  }

  async function handleRestore(storeId: string) {
    if (
      !window.confirm(
        "Restore this store? It will reappear in the Inactive tab " +
        "(disabled by default). You can re-enable it from there."
      )
    ) {
      return;
    }
    setRestoringId(storeId);
    try {
      await restoreStore(storeId);
      setRows((prev) =>
        prev.map((r) =>
          r.store.id === storeId ?
            {...r, store: {...r.store, status: undefined}} :
            r
        )
      );
    } catch {
      alert("Failed to restore store. Please try again.");
    } finally {
      setRestoringId(null);
    }
  }

  async function confirmDelete() {
    if (passcode !== DELETE_PASSCODE) {
      setPasscodeError(true);
      return;
    }
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await deleteStore(deleteTargetId);
      // Mark as deleted in local state — store will move to the Deleted tab
      // (visible there with a Restore button) instead of being hidden everywhere.
      setRows((prev) =>
        prev.map((r) =>
          r.store.id === deleteTargetId
            ? {...r, store: {...r.store, status: "deleted", isEnabled: false}}
            : r
        )
      );
      closeDeleteDialog();
    } catch {
      alert("Failed to delete store. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const visibleRows = filterRows(rows, tab);
  const tabs: TabId[] = ["active", "inactive", "paymentdue", "deleted"];

  return (
    <>
      <AppBar title="Main Store Admin" backHistory />

      {/* Delete confirmation dialog */}
      {deleteTargetId && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "1rem",
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "var(--radius)",
            padding: "1.5rem",
            maxWidth: 360,
            width: "100%",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          }}>
            <h3 style={{margin: "0 0 0.5rem", color: "#b91c1c", fontSize: "1.05rem"}}>
              Delete Store
            </h3>
            <p style={{margin: "0 0 1rem", fontSize: "0.88rem", color: "var(--color-text-muted)"}}>
              This will mark the store as deleted and disable it. The store admin's
              account will become inactive. This action cannot be undone.
            </p>
            <p style={{margin: "0 0 0.5rem", fontSize: "0.88rem", fontWeight: 600}}>
              Enter passcode to confirm:
            </p>
            <input
              type="password"
              value={passcode}
              onChange={(e) => { setPasscode(e.target.value); setPasscodeError(false); }}
              placeholder="Passcode"
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                border: `1.5px solid ${passcodeError ? "#b91c1c" : "#d1d5db"}`,
                fontSize: "1rem",
                marginBottom: "0.35rem",
                boxSizing: "border-box",
              }}
              onKeyDown={(e) => { if (e.key === "Enter") confirmDelete(); }}
              autoFocus
            />
            {passcodeError && (
              <p style={{color: "#b91c1c", fontSize: "0.82rem", margin: "0 0 0.75rem"}}>
                Incorrect passcode. Please try again.
              </p>
            )}
            <div style={{display: "flex", gap: "0.5rem", marginTop: "0.75rem"}}>
              <button
                className="btn"
                style={{
                  flex: 1,
                  background: "#b91c1c",
                  color: "#fff",
                  fontWeight: 700,
                  opacity: deleting ? 0.6 : 1,
                }}
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete Store"}
              </button>
              <button
                className="btn btn--outline"
                style={{flex: 1}}
                onClick={closeDeleteDialog}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 700}}>
          {loading ? (
            <p className="loading-text">Loading stores…</p>
          ) : (
            <>
              {/* Tabs */}
              <div style={{
                display: "flex",
                gap: "0.25rem",
                marginBottom: "1rem",
                background: "#f3f4f6",
                borderRadius: "var(--radius)",
                padding: "0.25rem",
              }}>
                {tabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      flex: 1,
                      padding: "0.45rem 0.5rem",
                      borderRadius: "calc(var(--radius) - 2px)",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      fontWeight: tab === t ? 700 : 500,
                      background: tab === t ? "#fff" : "transparent",
                      color: tab === t ? "var(--color-primary)" : "var(--color-text-muted)",
                      boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                      transition: "all 0.15s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tabLabel(t, rows)}
                  </button>
                ))}
              </div>

              {visibleRows.length === 0 ? (
                <p className="loading-text">No stores in this category.</p>
              ) : (
                visibleRows.map(({store, lastPaymentDate, accountStatus}) => (
                  <div
                    key={store.id}
                    className="nnc-card"
                    style={{
                      marginBottom: "0.75rem",
                      padding: "1rem",
                      opacity: store.isEnabled ? 1 : 0.65,
                    }}
                  >
                    <div style={{display: "flex", alignItems: "flex-start", gap: "1rem"}}>
                      {/* Icon */}
                      <div
                        className="action-card__icon-wrap"
                        style={{
                          background: store.isEnabled
                            ? "linear-gradient(135deg,#a78bfa,#7c3aed)"
                            : "linear-gradient(135deg,#9ca3af,#6b7280)",
                          flexShrink: 0,
                        }}
                      >
                        🏢
                      </div>

                      {/* Info */}
                      <div style={{flex: 1, minWidth: 0}}>
                        <div style={{display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap"}}>
                          <p style={{margin: 0, fontWeight: 700, fontSize: "0.95rem"}}>
                            {store.businessName || "(Unnamed)"}
                          </p>
                          {store.isDemoStore && (
                            <span style={{
                              background: "linear-gradient(135deg,#fcd34d,#f59e0b)",
                              color: "#78350f",
                              fontSize: "0.65rem", fontWeight: 800,
                              padding: "0.1rem 0.4rem", borderRadius: 4,
                              textTransform: "uppercase", letterSpacing: "0.05em",
                            }}>DEMO</span>
                          )}
                          {tab === "deleted" ? (
                            <span style={{
                              background: "#1f2937", color: "#fff",
                              fontSize: "0.65rem", fontWeight: 700,
                              padding: "0.1rem 0.4rem", borderRadius: 4,
                              textTransform: "uppercase",
                            }}>DELETED</span>
                          ) : (!store.isEnabled && (
                            <span style={{
                              background: "#fee2e2", color: "#b91c1c",
                              fontSize: "0.65rem", fontWeight: 700,
                              padding: "0.1rem 0.4rem", borderRadius: 4,
                              textTransform: "uppercase",
                            }}>DISABLED</span>
                          ))}
                          {tab === "paymentdue" && (
                            <span style={{
                              background: "#fef3c7", color: "#92400e",
                              fontSize: "0.65rem", fontWeight: 700,
                              padding: "0.1rem 0.4rem", borderRadius: 4,
                              textTransform: "uppercase",
                            }}>PAYMENT DUE</span>
                          )}
                        </div>
                        <p style={{margin: "0.1rem 0 0", fontSize: "0.82rem", color: "var(--color-text-muted)"}}>
                          {store.address || "No address"}
                        </p>
                        <p style={{margin: "0.25rem 0 0", fontSize: "0.8rem", color: "var(--color-text-muted)"}}>
                          Last payment: <strong>{formatDate(lastPaymentDate)}</strong>
                          {accountStatus && (
                            <span style={{marginLeft: "0.5rem", color: accountStatus === "active" ? "#059669" : "#b91c1c"}}>
                              ({accountStatus})
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Actions: toggle + delete (or restore if soft-deleted) */}
                      <div style={{display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem", flexShrink: 0}}>
                        {tab === "deleted" ? (
                          <button
                            onClick={() => handleRestore(store.id)}
                            disabled={restoringId === store.id}
                            style={{
                              background: "var(--color-primary)",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "0.4rem 0.8rem",
                              fontSize: "0.78rem",
                              cursor: restoringId === store.id ? "not-allowed" : "pointer",
                              fontWeight: 700,
                              opacity: restoringId === store.id ? 0.6 : 1,
                            }}
                          >
                            {restoringId === store.id ? "Restoring…" : "↺ Restore"}
                          </button>
                        ) : (
                          <>
                            {/* Enable/Disable toggle */}
                            <label style={{display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer"}}>
                              <span style={{fontSize: "0.78rem", color: "var(--color-text-muted)"}}>
                                {store.isEnabled ? "On" : "Off"}
                              </span>
                              <div
                                style={{
                                  position: "relative", width: 42, height: 24,
                                  borderRadius: 12,
                                  background: store.isEnabled ? "var(--color-primary)" : "#d1d5db",
                                  cursor: togglingId === store.id ? "not-allowed" : "pointer",
                                  transition: "background 0.2s", flexShrink: 0,
                                }}
                                onClick={() => togglingId === null && handleToggle(store.id, store.isEnabled ?? true)}
                              >
                                <div style={{
                                  position: "absolute", top: 3,
                                  left: store.isEnabled ? 21 : 3,
                                  width: 18, height: 18, borderRadius: "50%",
                                  background: "#fff",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                  transition: "left 0.2s",
                                }} />
                              </div>
                            </label>

                            {/* Delete button */}
                            <button
                              onClick={() => openDeleteDialog(store.id)}
                              style={{
                                background: "none",
                                border: "1px solid #fca5a5",
                                borderRadius: 6,
                                padding: "0.2rem 0.55rem",
                                fontSize: "0.75rem",
                                color: "#b91c1c",
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
