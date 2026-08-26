import { useApp } from '@/context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, ChevronLeft, ChevronRight, Store } from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: '工作台', icon: LayoutDashboard, path: '/' },
  { id: 'enterprises', label: '一企一档', icon: Building2, path: '/enterprises' },
];

export default function Sidebar() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed } = state;

  const currentPage = menuItems.find(item => item.path === location.pathname)?.id || 'dashboard';

  const handleNav = (item: typeof menuItems[0]) => {
    dispatch({ type: 'SET_PAGE', payload: item.id });
    navigate(item.path);
  };

  return (
    <aside
      className="h-screen bg-[#1e293b] text-white flex flex-col transition-all duration-200 fixed left-0 top-0 z-40"
      style={{ width: sidebarCollapsed ? 64 : 256 }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Store className="w-5 h-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="ml-3 overflow-hidden">
            <div className="text-sm font-semibold truncate">宁波高新区</div>
            <div className="text-[10px] text-slate-400 truncate">餐饮企业摸底平台</div>
          </div>
        )}
      </div>

      {/* Menu Label */}
      {!sidebarCollapsed && (
        <div className="px-4 pt-4 pb-2">
          <span className="text-xs text-slate-500 font-medium">主菜单</span>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-2 space-y-1">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150
                ${isActive
                  ? 'bg-slate-700 text-blue-400 border-l-[3px] border-blue-500'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200 border-l-[3px] border-transparent'
                }
                ${sidebarCollapsed ? 'justify-center' : ''}
              `}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-slate-700">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all duration-150"
        >
          {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
}
