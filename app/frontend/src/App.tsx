import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import TVCalling from "@/pages/TVCalling";
import Dashboard from "@/pages/Dashboard";
import Patients from "@/pages/Patients";
import NewCall from "@/pages/NewCall";
import Rooms from "@/pages/Rooms";
import Professionals from "@/pages/Professionals";
import Attendances from "@/pages/Attendances";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";

// Uma <Route> por página em src/pages; o layout autenticado fica em <AppLayout />.
// /tv é pública (roda em monitor próprio, sem login).
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/tv" element={<TVCalling />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pacientes" element={<Patients />} />
          <Route path="/chamada" element={<NewCall />} />
          <Route path="/consultorios" element={<Rooms />} />
          <Route path="/profissionais" element={<Professionals />} />
          <Route path="/atendimentos" element={<Attendances />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/configuracoes" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors closeButton />
    </>
  );
}
