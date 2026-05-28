import {Link, useNavigate} from "react-router-dom";

interface AppBarProps {
  title: string;
  showLogin?: boolean;
  showLogout?: boolean;
  onLogout?: () => void;
  /** Navigate back to this path when back button is clicked. */
  backTo?: string;
  /** Use browser history back instead of a fixed path. */
  backHistory?: boolean;
}

export function AppBar({title, showLogin, showLogout, onLogout, backTo, backHistory}: AppBarProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) navigate(backTo);
    else if (backHistory) navigate(-1);
  };

  return (
    <header className="app-bar">
      <div className="app-bar__left">
        {(backTo || backHistory) && (
          <button type="button" className="app-bar__back" onClick={handleBack} aria-label="Back">
            ‹
          </button>
        )}
        <Link to="/customer" style={{color: "inherit", textDecoration: "none"}}>
          <h1 className="app-bar__title">{title}</h1>
        </Link>
      </div>
      <div className="app-bar__actions">
        {showLogin && (
          <Link to="/login" className="btn btn--ghost btn--sm">
            Log in
          </Link>
        )}
        {showLogout && onLogout && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onLogout}>
            Log out
          </button>
        )}
      </div>
    </header>
  );
}

/** Reusable gradient icon circle matching the Android/iOS design. */
export function IconCircle({emoji, gradient, size = 48}: {emoji: string; gradient: string; size?: number}) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: gradient, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: size * 0.42, flexShrink: 0,
      }}
    >
      {emoji}
    </div>
  );
}
