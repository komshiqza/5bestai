// Ensure Node Buffer is available in the browser for libraries that expect it
import "./polyfills/buffer";

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
