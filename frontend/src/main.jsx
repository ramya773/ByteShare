import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import {
  setAuthTokenGetter,
  setBaseUrl,
} from "@workspace/api-client-react";

// Change this to your backend URL
setBaseUrl("https://byteshare-api.onrender.com");

setAuthTokenGetter(() => localStorage.getItem("byteshare_token"));

createRoot(document.getElementById("root")).render(<App />);