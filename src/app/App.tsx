import {BrowserRouter} from "react-router-dom";
import {AuthProvider} from "../core/auth/AuthContext";
import {RootRouter} from "./RootRouter";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RootRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
