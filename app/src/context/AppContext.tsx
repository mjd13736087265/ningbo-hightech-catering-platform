import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Enterprise } from '@/types';
import { initialEnterprises, getStatistics } from '@/data/enterprises';

interface AppState {
  enterprises: Enterprise[];
  selectedEnterprise: Enterprise | null;
  drawerOpen: boolean;
  currentPage: string;
  isMobile: boolean;
  sidebarCollapsed: boolean;
}

type AppAction =
  | { type: 'SET_ENTERPRISES'; payload: Enterprise[] }
  | { type: 'ADD_ENTERPRISE'; payload: Enterprise }
  | { type: 'UPDATE_ENTERPRISE'; payload: Enterprise }
  | { type: 'SELECT_ENTERPRISE'; payload: Enterprise | null }
  | { type: 'TOGGLE_DRAWER' }
  | { type: 'CLOSE_DRAWER' }
  | { type: 'SET_PAGE'; payload: string }
  | { type: 'SET_MOBILE'; payload: boolean }
  | { type: 'TOGGLE_SIDEBAR' };

const initialState: AppState = {
  enterprises: initialEnterprises,
  selectedEnterprise: null,
  drawerOpen: false,
  currentPage: 'dashboard',
  isMobile: false,
  sidebarCollapsed: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ENTERPRISES':
      return { ...state, enterprises: action.payload };
    case 'ADD_ENTERPRISE':
      return { ...state, enterprises: [action.payload, ...state.enterprises] };
    case 'UPDATE_ENTERPRISE':
      return { ...state, enterprises: state.enterprises.map(e => e.id === action.payload.id ? action.payload : e) };
    case 'SELECT_ENTERPRISE':
      return { ...state, selectedEnterprise: action.payload };
    case 'TOGGLE_DRAWER':
      return { ...state, drawerOpen: !state.drawerOpen };
    case 'CLOSE_DRAWER':
      return { ...state, drawerOpen: false, selectedEnterprise: null };
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_MOBILE':
      return { ...state, isMobile: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  statistics: ReturnType<typeof getStatistics>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const checkMobile = () => {
      dispatch({ type: 'SET_MOBILE', payload: window.innerWidth < 768 });
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const statistics = getStatistics(state.enterprises);

  return (
    <AppContext.Provider value={{ state, dispatch, statistics }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
