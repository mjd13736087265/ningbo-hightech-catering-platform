import { useApp } from '@/context/AppContext';
import Sidebar from './Sidebar';
import EnterpriseDetail from './EnterpriseDetail';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  const { sidebarCollapsed } = state;

  return (
    <div className="min-h-screen bg-[#f1f5f9]">
      <Sidebar />
      <main
        className="transition-all duration-200 min-h-screen"
        style={{ marginLeft: sidebarCollapsed ? 64 : 256 }}
      >
        <div className="p-6 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
      <EnterpriseDetail />
    </div>
  );
}
