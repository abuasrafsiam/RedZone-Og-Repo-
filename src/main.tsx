import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Set light theme immediately, before React renders
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.classList.add(savedTheme);

createRoot(document.getElementById("root")!).render(<App />);
