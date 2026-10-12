import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { loadThirdParties } from "@/services/thirdParties";

loadThirdParties();
createRoot(document.getElementById("root")!).render(<App />);
