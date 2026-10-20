import "../ui/estilos.css";
import "./admin.css";
import { createRoot } from "react-dom/client";
import { Admin } from "./Admin";

createRoot(document.getElementById("raiz")!).render(<Admin />);
