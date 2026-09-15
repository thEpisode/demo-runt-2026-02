import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "../pages/Home.page";
import { SearchPage } from "../pages/Search.page";
import { AssistantPage } from "../pages/Assistant.page";
import { BuilderPage } from "../pages/Builder.page";

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/buscador" element={<SearchPage />} />
    <Route path="/asistente" element={<AssistantPage />} />
    <Route path="/constructor" element={<BuilderPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
