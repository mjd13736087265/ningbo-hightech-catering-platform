import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import EnterpriseList from '@/pages/EnterpriseList';
import MobileInspection from '@/pages/MobileInspection';
import './App.css';

function AppRoutes() {
  const location = useLocation();
  const isMobileRoute = location.pathname.startsWith('/mobile');

  if (isMobileRoute) {
    return (
      <Routes>
        <Route path="/mobile/inspection" element={<MobileInspection />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/enterprises" element={<EnterpriseList />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <HashRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </HashRouter>
  );
}

export default App;
