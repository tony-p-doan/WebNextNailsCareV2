import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {useAuth} from "../../../core/auth/AuthContext";
import {getEmployeeStoresForUser} from "../../../data/store/storeApi";
import type {Employee, Store} from "../../../domain/models/Store";
import {getProviderRatingSummary} from "../../../data/providerRatingsApi";
import type {ProviderRatingSummary} from "../../../domain/models/ProviderRating";

export function ProviderDashboardPage() {
  const {user, signOut} = useAuth();
  const [assignments, setAssignments] = useState<Array<{store: Store; employee: Employee}>>([]);
  const [ratingSummary, setRatingSummary] = useState<ProviderRatingSummary | null>(null);
  const primary = assignments[0];

  useEffect(() => {
    if (!user) return;
    getEmployeeStoresForUser(user.uid).then(setAssignments).catch(() => setAssignments([]));
  }, [user]);

  useEffect(() => {
    if (!primary) return;
    getProviderRatingSummary(primary.store.id, primary.employee.id)
      .then(setRatingSummary)
      .catch(() => setRatingSummary(null));
  }, [primary?.store.id, primary?.employee.id]);

  return (
    <>
      <AppBar title="Employee" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 720}}>
          <p className="nnc-label">Employee Menu</p>
          {assignments.length > 0 && (
            <div className="nnc-card" style={{padding: "1rem", marginBottom: "1rem"}}>
              <p style={{margin: 0, fontWeight: 700}}>
                {primary.employee.firstName} {primary.employee.lastName}
              </p>
              <p style={{margin: "0.25rem 0 0", color: "var(--color-text-muted)"}}>
                {primary.store.businessName}
              </p>
              <p style={{margin: "0.5rem 0 0", color: "var(--color-primary)", fontWeight: 700}}>
                {ratingSummary?.ratingCount
                  ? `★ ${ratingSummary.ratingAverage.toFixed(1)} from ${ratingSummary.ratingCount} rating${ratingSummary.ratingCount === 1 ? "" : "s"}`
                  : "No provider ratings yet"}
              </p>
            </div>
          )}
          <div className="card-grid" style={{gap: "0.75rem"}}>
            {primary && (
              <Link className="action-card" to="/customer/share-experience" style={{textDecoration: "none"}}>
                <div className="action-card__icon" style={{background: "linear-gradient(135deg,#f9a8d4,#ec4899)"}}>📸</div>
                <div className="action-card__content"><h3>Shared Experience</h3><p>Capture and share customer before/after photos.</p></div>
                <span className="action-card__chevron">›</span>
              </Link>
            )}
            {primary && (
              <Link className="action-card" to={`/store-admin/schedules/employee/${primary.employee.id}`} style={{textDecoration: "none"}}>
                <div className="action-card__icon" style={{background: "linear-gradient(135deg,#6ee7b7,#10b981)"}}>🗓</div>
                <div className="action-card__content"><h3>Manage Calendar</h3><p>Update your employee schedule.</p></div>
                <span className="action-card__chevron">›</span>
              </Link>
            )}
            <Link className="action-card" to="/customer/book-by-provider" style={{textDecoration: "none"}}>
              <div className="action-card__icon" style={{background: "linear-gradient(135deg,#6ee7f7,#3b82f6)"}}>👤</div>
              <div className="action-card__content"><h3>Book by Provider</h3><p>Book an appointment with a specific provider.</p></div>
              <span className="action-card__chevron">›</span>
            </Link>
            <Link className="action-card" to="/provider/appointments" style={{textDecoration: "none"}}>
              <div className="action-card__icon" style={{background: "linear-gradient(135deg,#fcd34d,#f59e0b)"}}>✓</div>
              <div className="action-card__content"><h3>Manage Appointment</h3><p>Cancel appointments assigned to you.</p></div>
              <span className="action-card__chevron">›</span>
            </Link>
          </div>
          <button className="btn btn--outline btn--full" onClick={signOut} style={{marginTop: "1rem"}}>
            Log Out
          </button>
        </main>
      </div>
    </>
  );
}
