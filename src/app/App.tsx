import { BrowserRouter } from "react-router-dom";
import { RootRouter } from "./RootRouter";

export function App() {
  return (
    <BrowserRouter>
      <RootRouter />
    </BrowserRouter>
  );
}
