import {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {AppBar} from "../../core/ui/AppBar";
import {AuthService} from "../../core/auth/AuthService";
import {useAuth} from "../../core/auth/AuthContext";
import {
  getStoresForAdmin,
  getStaffWorkingCount,
} from "../../data/store/storeApi";
import {getStatsForDate} from "../../data/appointmentApi";
import type {Store} from "../../domain/models/Store";
import {getActiveStoreId, setActiveStoreId} from "./storeAdminContext";
import {FunctionsClient} from "../../data/functions/FunctionsClient";
import {
  acknowledgeAdminAccessNotice,
  listPendingAdminAccessNotices,
} from "../../data/storeAdminAccessNoticeApi";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDateString(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function dateParts(dateStr: string): {year: number; month: number; day: number} {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return {year: y, month: mo - 1, day: d};
}

function formatDateDisplay(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-");
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return date.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"});
}

export function StoreManagementPage() {
  const {user, profile, signOut} = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [aptCount, setAptCount] = useState<string>("—");
  const [staffCount, setStaffCount] = useState<string>("—");
  const [revenue, setRevenue] = useState<string>("—");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const initialDateParts = dateParts(todayString());
  const [viewYear, setViewYear] = useState(initialDateParts.year);
  const [viewMonth, setViewMonth] = useState(initialDateParts.month);

  // Multi-store
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");

  // Add Another Store form
  const [showAddStore, setShowAddStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreAddress, setNewStoreAddress] = useState("");
  const [newStoreCity, setNewStoreCity] = useState("");
  const [newStoreState, setNewStoreState] = useState("");
  const [newStoreZip, setNewStoreZip] = useState("");
  const [addingStore, setAddingStore] = useState(false);
  const [addStoreError, setAddStoreError] = useState<string | null>(null);
  const [adminNotice, setAdminNotice] = useState<{id: string; storeName: string} | null>(null);

  const isToday = selectedDate === todayString();
  const dateLabel = isToday ? "Today" : formatDateDisplay(selectedDate);

  // Initial setup: load profile + all stores for this admin
  useEffect(() => {
    if (!user) return;
    (async () => {
      const p = await AuthService.getProfile(user.uid);
      if (p && "firstName" in p) setDisplayName(p.firstName.trim() || "");
      const stores = await getStoresForAdmin(user.uid);
      setAllStores(stores);
      const rememberedStoreId = getActiveStoreId();
      const rememberedStore = stores.find((s) => s.id === rememberedStoreId);
      // Restore the last selected location when returning from child pages.
      // Fall back to the primary/first store only when the remembered store is
      // no longer available to this admin.
      const nextStore =
        rememberedStore ?? stores.find((s) => s.id === user.uid) ?? stores[0];
      if (nextStore) {
        setSelectedStoreId(nextStore.id);
        setActiveStoreId(nextStore.id);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const notices = await listPendingAdminAccessNotices(user.uid);
      const first = notices[0];
      if (!first) return;
      setActiveStoreId(first.storeId);
      setSelectedStoreId(first.storeId);
      setAdminNotice({id: first.id, storeName: first.storeName});
    })();
  }, [user]);

  // Reload stats whenever the selected store or date changes
  useEffect(() => {
    if (!selectedStoreId) return;
    setStatsLoading(true);
    Promise.all([
      getStatsForDate(selectedStoreId, selectedDate),
      getStaffWorkingCount(selectedStoreId, selectedDate),
    ]).then(([{count, revenueCents}, staff]) => {
      setAptCount(String(count));
      setStaffCount(String(staff));
      setRevenue(`$${(revenueCents / 100).toFixed(2)}`);
      setStatsLoading(false);
    }).catch(() => setStatsLoading(false));
  }, [selectedStoreId, selectedDate]);

  const greeting = displayName ? `Welcome back, ${displayName}!` : "Welcome back!";
  const selectedStore = allStores.find((s) => s.id === selectedStoreId);
  const ownsSelectedStore = !!user && !!selectedStore && (
    selectedStore.id === user.uid || selectedStore.storeAdminId === user.uid
  );
  const canAddAnotherStore = !!user && allStores.some((s) =>
    s.id === user.uid || s.storeAdminId === user.uid
  );
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calendarCells: Array<{day: number | null}> = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push({day: null});
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push({day: d});

  function openDatePicker() {
    const parts = dateParts(selectedDate);
    setViewYear(parts.year);
    setViewMonth(parts.month);
    setShowDatePicker(true);
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function prevYear() {
    setViewYear((y) => y - 1);
  }

  function nextYear() {
    setViewYear((y) => y + 1);
  }

  function selectCalendarDate(day: number) {
    setSelectedDate(toDateString(viewYear, viewMonth, day));
    setShowDatePicker(false);
  }

  async function handleAddStore(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setAddingStore(true);
    setAddStoreError(null);
    try {
      const newStore = await FunctionsClient.createAdditionalStore(
        newStoreName,
        newStoreAddress,
        newStoreCity,
        newStoreState,
        newStoreZip
      );
      const updated = [...allStores, newStore].sort((a, b) => {
        if (a.id === user.uid) return -1;
        if (b.id === user.uid) return 1;
        return a.businessName.localeCompare(b.businessName);
      });
      setAllStores(updated);
      setSelectedStoreId(newStore.id);
      setActiveStoreId(newStore.id);
      setNewStoreName("");
      setNewStoreAddress("");
      setNewStoreCity("");
      setNewStoreState("");
      setNewStoreZip("");
      setShowAddStore(false);
    } catch (err) {
      setAddStoreError(err instanceof Error ? err.message : "Failed to add store.");
    } finally {
      setAddingStore(false);
    }
  }

  return (
    <>
      <AppBar
        title="Store Management"
        showLogout={!!user}
        onLogout={async () => { await signOut(); navigate("/customer", {replace: true}); }}
      />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 680}}>

          {/* Welcome */}
          <div className="welcome-banner">
            <h2 className="welcome-banner__greeting">{greeting}</h2>
            <p className="welcome-banner__sub">
              {isToday ? "Let's manage your salon today." : `Viewing stats for ${dateLabel}.`}
            </p>
          </div>

          {/* Store selector — only shown when admin has 2+ stores */}
          {allStores.length > 1 && (
            <div style={{marginBottom: "1rem"}}>
              <label style={{
                fontSize: "0.82rem",
                color: "var(--color-text-muted)",
                display: "block",
                marginBottom: "0.3rem",
                fontWeight: 600,
              }}>
                Currently managing
              </label>
              <select
                value={selectedStoreId}
                onChange={(e) => {
                  setSelectedStoreId(e.target.value);
                  setActiveStoreId(e.target.value);
                }}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1.5px solid var(--color-primary)",
                  fontSize: "0.95rem",
                  background: "#fff",
                  color: "var(--color-text)",
                  cursor: "pointer",
                }}
              >
                {allStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.businessName || "(Unnamed store)"}{s.id === user?.uid ? " (Primary)" : ""}
                  </option>
                ))}
              </select>
              {selectedStore && (
                <p style={{margin: "0.25rem 0 0", fontSize: "0.8rem", color: "var(--color-text-muted)"}}>
                  {selectedStore.address || "No address on file"}
                </p>
              )}
            </div>
          )}

          {/* Date picker row */}
          <div style={{display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem"}}>
            <button
              onClick={openDatePicker}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "0.3rem",
                color: "var(--color-primary)", fontWeight: 500, fontSize: "0.88rem",
              }}
            >
              Change Date 📅
            </button>
          </div>

          {showDatePicker && (
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowDatePicker(false);
              }}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "1rem",
                zIndex: 50,
              }}
            >
              <div className="form-card" style={{maxWidth: 420, width: "100%"}}>
                <div className="calendar">
                  <div className="calendar__header">
                    <button
                      className="btn btn--sm btn--outline"
                      onClick={prevMonth}
                      aria-label="Previous month"
                    >
                      ‹
                    </button>
                    <span className="calendar__month">
                      {MONTHS[viewMonth]} {viewYear}
                    </span>
                    <button
                      className="btn btn--sm btn--outline"
                      onClick={nextMonth}
                      aria-label="Next month"
                    >
                      ›
                    </button>
                  </div>
                  <div
                    className="calendar__header"
                    style={{marginTop: "-0.25rem"}}
                  >
                    <button
                      className="btn btn--sm btn--outline"
                      onClick={prevYear}
                      aria-label="Previous year"
                    >
                      «
                    </button>
                    <span className="calendar__month">{viewYear}</span>
                    <button
                      className="btn btn--sm btn--outline"
                      onClick={nextYear}
                      aria-label="Next year"
                    >
                      »
                    </button>
                  </div>
                  <div className="calendar__grid">
                    {DAYS.map((d) => (
                      <div key={d} className="calendar__day-label">{d}</div>
                    ))}
                    {calendarCells.map((cell, i) => {
                      if (!cell.day) {
                        return (
                          <div
                            key={i}
                            className="calendar__day calendar__day--empty"
                          />
                        );
                      }
                      const str = toDateString(viewYear, viewMonth, cell.day);
                      const isSelected = str === selectedDate;
                      const isTodayDate = str === todayString();
                      return (
                        <button
                          key={i}
                          className={[
                            "calendar__day",
                            isSelected ? "calendar__day--selected" : "",
                            isTodayDate && !isSelected ?
                              "calendar__day--today" :
                              "",
                          ].join(" ")}
                          onClick={() => selectCalendarDate(cell.day!)}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  className="btn btn--sm btn--outline"
                  style={{marginTop: "1rem"}}
                  onClick={() => setShowDatePicker(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="stats-row" style={{opacity: statsLoading ? 0.5 : 1}}>
            <div className="stat-pill">
              <span className="stat-pill__value">{aptCount}</span>
              <span className="stat-pill__label">Appointments{"\n"}{dateLabel}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-pill__value">{staffCount}</span>
              <span className="stat-pill__label">Staff Working</span>
            </div>
            <div className="stat-pill">
              <span className="stat-pill__value">{revenue}</span>
              <span className="stat-pill__label">Revenue</span>
            </div>
          </div>

          {!isToday && (
            <button
              className="btn btn--outline btn--sm"
              style={{display: "block", margin: "-0.5rem auto 1rem"}}
              onClick={() => setSelectedDate(todayString())}
            >
              Back to today
            </button>
          )}

          {/* Action cards */}
          <p className="nnc-label" style={{marginTop: "0.5rem"}}>Store Operations</p>
          <div className="card-grid" style={{gap: "0.75rem"}}>
            <ActionCard
              to="/store-admin/calendar"
              icon="📆"
              gradient="linear-gradient(135deg,#6ee7f7,#3b82f6)"
              title="Store Calendar"
              sub="Weekly view of all appointments."
            />
            <ActionCard
              to="/store-admin/employees"
              icon="👥"
              gradient="linear-gradient(135deg,#a78bfa,#7c3aed)"
              title="Manage Employees"
              sub="Add and edit employees."
            />
            <ActionCard
              to="/store-admin/schedules"
              icon="📅"
              gradient="linear-gradient(135deg,#a78bfa,#7c3aed)"
              title="Manage Schedules"
              sub="Set work hours per employee."
            />
            <ActionCard
              to="/store-admin/services"
              icon="💅"
              gradient="linear-gradient(135deg,#f9a8d4,#ec4899)"
              title="Manage Services"
              sub="Services and pricing."
            />
            <ActionCard
              to="/store-admin/reports"
              icon="📊"
              gradient="linear-gradient(135deg,#6ee7b7,#10b981)"
              title="Reports"
              sub="Sales by service type or employee."
            />
            <ActionCard
              to="/store-admin/share-experience"
              icon="📷"
              gradient="linear-gradient(135deg,#6ee7f7,#3b82f6)"
              title="Shared Experiences"
              sub="View customer before and after pages."
            />
          </div>

          <p className="nnc-label" style={{marginTop: "1.5rem"}}>Customer Rewards</p>
          <div className="card-grid" style={{gap: "0.75rem"}}>
            <ActionCard
              to="/store-admin/rewards"
              icon="⭐"
              gradient="linear-gradient(135deg,#fcd34d,#f59e0b)"
              title="Manage Rewards"
              sub="Customer loyalty rules."
            />
            <ActionCard
              to="/store-admin/special-offers"
              icon="%"
              gradient="linear-gradient(135deg,#6ee7b7,#10b981)"
              title="Special Offers"
              sub="Platinum member offers."
            />
            <ActionCard
              to="/store-admin/rewards-status"
              icon="🏆"
              gradient="linear-gradient(135deg,#a78bfa,#7c3aed)"
              title="Rewards Status"
              sub="Set Platinum appointment threshold."
            />
            <ActionCard
              to="/store-admin/redeem-reward"
              icon="▣"
              gradient="linear-gradient(135deg,#6ee7f7,#3b82f6)"
              title="Redeem Reward"
              sub="Scan a customer's reward QR code."
            />
            <ActionCard
              to="/store-admin/awards"
              icon="★"
              gradient="linear-gradient(135deg,#f9a8d4,#ec4899)"
              title="Awards and Ratings"
              sub="Monthly winners and provider reviews."
            />
          </div>

          <p className="nnc-label" style={{marginTop: "1.5rem"}}>Account</p>
          <div className="card-grid" style={{gap: "0.75rem"}}>
            <ActionCard
              to="/store-admin/account"
              icon="💳"
              gradient="linear-gradient(135deg,#6ee7b7,#10b981)"
              title="Manage Account"
              sub="Subscription and billing."
            />
            {ownsSelectedStore && (
              <ActionCard
                to={`/store-admin/admins/${selectedStoreId}`}
                icon="🔑"
                gradient="linear-gradient(135deg,#a78bfa,#7c3aed)"
                title="Manage Admins"
                sub="Add or remove co-admins by email."
              />
            )}
          </div>

          {/* Add Another Store */}
          {canAddAnotherStore && (
            <div style={{paddingTop: "32px"}}>
              {!showAddStore ? (
                <button
                  className="btn btn--outline"
                  style={{width: "100%", marginBottom: "1rem"}}
                  onClick={() => setShowAddStore(true)}
                >
                  + Add Another Store
                </button>
              ) : (
            <div style={{
              background: "#fff",
              borderRadius: "var(--radius)",
              padding: "1.25rem",
              boxShadow: "var(--shadow)",
              marginBottom: "1rem",
            }}>
              <h3 style={{margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700}}>
                Add Another Store
              </h3>
              <form onSubmit={handleAddStore}>
                <div style={{marginBottom: "0.75rem"}}>
                  <label style={{fontSize: "0.82rem", color: "var(--color-text-muted)", display: "block", marginBottom: "0.3rem"}}>
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder="e.g. My Nail Salon – Downtown"
                    required
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1.5px solid #d1d5db",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{marginBottom: "1rem"}}>
                  <label style={{fontSize: "0.82rem", color: "var(--color-text-muted)", display: "block", marginBottom: "0.3rem"}}>
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={newStoreAddress}
                    onChange={(e) => setNewStoreAddress(e.target.value)}
                    placeholder="e.g. 456 Oak Ave"
                    required
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1.5px solid #d1d5db",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{marginBottom: "0.75rem"}}>
                  <label style={{fontSize: "0.82rem", color: "var(--color-text-muted)", display: "block", marginBottom: "0.3rem"}}>
                    City *
                  </label>
                  <input
                    type="text"
                    value={newStoreCity}
                    onChange={(e) => setNewStoreCity(e.target.value)}
                    placeholder="e.g. Springfield"
                    required
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1.5px solid #d1d5db",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem"}}>
                  <div>
                    <label style={{fontSize: "0.82rem", color: "var(--color-text-muted)", display: "block", marginBottom: "0.3rem"}}>
                      State *
                    </label>
                    <input
                      type="text"
                      value={newStoreState}
                      onChange={(e) => setNewStoreState(e.target.value)}
                      placeholder="CA"
                      required
                      maxLength={2}
                      style={{
                        width: "100%",
                        padding: "0.55rem 0.75rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1.5px solid #d1d5db",
                        fontSize: "0.95rem",
                        boxSizing: "border-box",
                        textTransform: "uppercase",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{fontSize: "0.82rem", color: "var(--color-text-muted)", display: "block", marginBottom: "0.3rem"}}>
                      ZIP *
                    </label>
                    <input
                      type="text"
                      value={newStoreZip}
                      onChange={(e) => setNewStoreZip(e.target.value)}
                      placeholder="92101"
                      required
                      inputMode="numeric"
                      style={{
                        width: "100%",
                        padding: "0.55rem 0.75rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1.5px solid #d1d5db",
                        fontSize: "0.95rem",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
                {addStoreError && (
                  <p style={{color: "#b91c1c", fontSize: "0.85rem", marginBottom: "0.75rem"}}>
                    {addStoreError}
                  </p>
                )}
                <div style={{display: "flex", gap: "0.5rem"}}>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={
                      addingStore ||
                      !newStoreName.trim() ||
                      !newStoreAddress.trim() ||
                      !newStoreCity.trim() ||
                      !newStoreState.trim() ||
                      !newStoreZip.trim()
                    }
                    style={{flex: 1}}
                  >
                    {addingStore ? "Adding…" : "Add Store"}
                  </button>
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={() => {
                      setShowAddStore(false);
                      setNewStoreName("");
                      setNewStoreAddress("");
                      setNewStoreCity("");
                      setNewStoreState("");
                      setNewStoreZip("");
                      setAddStoreError(null);
                    }}
                    style={{flex: 1}}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
              )}
            </div>
          )}

          {/* List of this admin's stores (when 2+) */}
          {allStores.length > 1 && (
            <div style={{marginBottom: "1.5rem"}}>
              {allStores.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedStoreId(s.id);
                    setActiveStoreId(s.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    background: s.id === selectedStoreId ? "var(--color-primary-light, #ede9fe)" : "#fff",
                    borderRadius: "var(--radius)",
                    marginBottom: "0.5rem",
                    cursor: "pointer",
                    boxShadow: "var(--shadow)",
                    border: s.id === selectedStoreId ? "1.5px solid var(--color-primary)" : "1.5px solid transparent",
                  }}
                >
                  <span style={{fontSize: "1.4rem"}}>🏢</span>
                  <div style={{flex: 1, minWidth: 0}}>
                    <p style={{margin: 0, fontWeight: 700, fontSize: "0.9rem"}}>
                      {s.businessName || "(Unnamed)"}
                      {(s.id === user?.uid || s.storeAdminId === user?.uid) && (
                        <span style={{
                          marginLeft: "0.4rem",
                          fontSize: "0.65rem",
                          background: "#e0e7ff",
                          color: "#3730a3",
                          padding: "0.1rem 0.35rem",
                          borderRadius: 4,
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}>Primary</span>
                      )}
                    </p>
                    <p style={{margin: 0, fontSize: "0.78rem", color: "var(--color-text-muted)"}}>
                      {s.address || "No address"}
                    </p>
                  </div>
                  {s.id === selectedStoreId && (
                    <span style={{color: "var(--color-primary)", fontWeight: 700}}>✓</span>
                  )}
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
      {adminNotice && user && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 60,
          }}
        >
          <div className="form-card" style={{maxWidth: 420, width: "100%"}}>
            <h3 style={{margin: "0 0 0.5rem", fontSize: "1.1rem"}}>
              Store admin access added
            </h3>
            <p style={{margin: "0 0 1rem", color: "var(--color-text-muted)", lineHeight: 1.45}}>
              You are now an admin for {adminNotice.storeName || "this store"}.
            </p>
            <button
              className="btn--primary-full"
              onClick={async () => {
                await acknowledgeAdminAccessNotice(user.uid, adminNotice.id);
                setAdminNotice(null);
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ActionCard({to, icon, gradient, title, sub}: {to: string; icon: string; gradient: string; title: string; sub: string}) {
  return (
    <Link to={to} className="action-card">
      <div className="action-card__icon-wrap" style={{background: gradient}}>{icon}</div>
      <div className="action-card__body">
        <p className="action-card__title">{title}</p>
        <p className="action-card__subtitle">{sub}</p>
      </div>
      <span className="action-card__chevron">›</span>
    </Link>
  );
}
