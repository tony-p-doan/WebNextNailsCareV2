import {Navigate} from "react-router-dom";
import {useAuth} from "../auth/AuthContext";

export function SuperAdminGuard({children}: {children: React.ReactNode}) {
  const {user, profile, loading} = useAuth();

  if (loading) return null;

  if (!user || profile?.role !== "superadmin") {
    return <Navigate to="/customer" replace />;
  }

  return <>{children}</>;
}
