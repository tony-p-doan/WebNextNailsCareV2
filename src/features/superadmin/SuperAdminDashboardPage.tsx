import {Link, useNavigate} from "react-router-dom";
import {AppBar} from "../../core/ui/AppBar";
import {useAuth} from "../../core/auth/AuthContext";

export function SuperAdminDashboardPage() {
  const {user, signOut} = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <AppBar
        title="Super Admin"
        showLogout={!!user}
        onLogout={async () => {
          await signOut();
          navigate("/customer", {replace: true});
        }}
      />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 600}}>
          <div className="welcome-banner">
            <h2 className="welcome-banner__greeting">Super Admin</h2>
            <p className="welcome-banner__sub">Manage all stores on the platform.</p>
          </div>

          <p className="nnc-label" style={{marginTop: "1rem"}}>Administration</p>
          <div className="card-grid" style={{gap: "0.75rem"}}>
            <ActionCard
              to="/super-admin/stores"
              icon="🏢"
              gradient="linear-gradient(135deg,#a78bfa,#7c3aed)"
              title="Main Store Admin"
              sub="Enable or disable stores. View payment dates."
            />
            <ActionCard
              to="/super-admin/messaging"
              icon="📣"
              gradient="linear-gradient(135deg,#6ee7f7,#3b82f6)"
              title="Customer Messaging"
              sub="Send rewards reminders or custom push notifications."
            />
            <ActionCard
              to="/super-admin/transactions"
              icon="💳"
              gradient="linear-gradient(135deg,#34d399,#059669)"
              title="Transaction History"
              sub="Browse Stripe payments and invoices for any store."
            />
          </div>
        </main>
      </div>
    </>
  );
}

function ActionCard({
  to, icon, gradient, title, sub,
}: {
  to: string;
  icon: string;
  gradient: string;
  title: string;
  sub: string;
}) {
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
