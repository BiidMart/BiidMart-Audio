import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Knowledge from "./pages/Knowledge";
import Conversations from "./pages/Conversations";
import Resources from "./pages/Resources";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/knowledge" element={<Knowledge />} />
        <Route path="/conversations" element={<Conversations />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}