import { Navigate } from "react-router-dom";

// "/" encaminha para o painel principal; o splash padrão do template foi removido.
export default function Home() {
  return <Navigate to="/dashboard" replace />;
}
