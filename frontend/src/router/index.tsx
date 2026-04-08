import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AgentSecurityPage from '../pages/admin/AgentSecurityPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AgentSecurityPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function Router() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default Router;
