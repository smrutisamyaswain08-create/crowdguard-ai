import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CameraManagement from './pages/CameraManagement';
import EventHistory from './pages/EventHistory';
import Reports from './pages/Reports';
import AdminPanel from './pages/AdminPanel';
import ImageAnalysis from './pages/ImageAnalysis';
import AuditLogs from './pages/AuditLogs';

// Smart Tourism & Safety Enhancements
import SpatialMap from './pages/SpatialMap';
import IncidentsAndForecasting from './pages/IncidentsAndForecasting';
import EmergencyServices from './pages/EmergencyServices';
import VisitorGuidanceAndPrivacy from './pages/VisitorGuidanceAndPrivacy';
import HistoryAnd3DModel from './pages/HistoryAnd3DModel';
import SatelliteAnalytics from './pages/SatelliteAnalytics';
import PilgrimSafeAI from './pages/PilgrimSafeAI';
import WhatIfSimulator from './pages/WhatIfSimulator';
import SafeVisit from './pages/SafeVisit';
import AIPanditjiAssistantWidget from './components/AIPanditjiAssistantWidget';
import OfflineIndicator from './components/OfflineIndicator';

import { 
  Activity, Camera, Calendar, FileText, Settings, LogOut, ShieldCheck, Image, ClipboardList,
  ChevronLeft, ChevronRight, Sun, Moon, MapPin, TrendingUp, Siren, Globe, UserCheck, Radar, Landmark, BrainCircuit, Cpu
} from 'lucide-react';
import './styles/theme.css';

const NavigationSidebar = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed, theme, setTheme }) => {
  const { user, logout } = useAuth();
  
  const allMenuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: Activity, roles: ['admin', 'site_manager', 'security_officer'] },
    { id: 'whatif-simulator', name: '3D Digital Twin & What-If', icon: Cpu, roles: ['admin', 'site_manager', 'security_officer', 'emergency_service', 'visitor'] },
    { id: 'safe-visit', name: 'Safe Visit', icon: ShieldCheck, roles: ['visitor', 'admin', 'site_manager', 'security_officer', 'emergency_service'] },
    { id: 'pilgrim-safe-ai', name: 'PILGRIM SAFE AI', icon: BrainCircuit, roles: ['admin', 'site_manager', 'security_officer', 'emergency_service', 'visitor'] },
    { id: 'spatial-map', name: 'Interactive GIS Map', icon: MapPin, roles: ['admin', 'site_manager', 'security_officer', 'emergency_service', 'visitor'] },
    { id: 'satellite-analytics', name: 'Satellite Area AI', icon: Radar, roles: ['admin', 'site_manager', 'security_officer', 'emergency_service'] },
    { id: 'incidents-forecasting', name: 'AI Forecast & Surges', icon: TrendingUp, roles: ['admin', 'site_manager', 'security_officer', 'emergency_service'] },
    { id: 'emergency-services', name: 'Emergency SOS Board', icon: Siren, roles: ['admin', 'site_manager', 'security_officer', 'emergency_service', 'visitor'] },
    { id: 'visitor-guidance', name: 'Visitor Guidance & PII', icon: Globe, roles: ['visitor'] },
    { id: 'history-3d-model', name: 'History & 3D Model', icon: Landmark, roles: ['visitor'] },
    { id: 'cameras', name: 'Camera Feeds', icon: Camera, roles: ['admin', 'site_manager', 'security_officer'] },
    { id: 'image-detection', name: 'Image Analysis', icon: Image, roles: ['admin', 'site_manager', 'security_officer'] },
    { id: 'events', name: 'Event History', icon: Calendar, roles: ['admin', 'site_manager', 'security_officer'] },
    { id: 'reports', name: 'Reports', icon: FileText, roles: ['admin'] },
    { id: 'audit-logs', name: 'Audit Logs', icon: ClipboardList, roles: ['admin'] },
    { id: 'admin', name: 'Admin Control', icon: Settings, roles: ['admin'] },
  ];


  // Filter menu items by current user role
  const userRole = user?.role || 'visitor';
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  const firstLetter = user?.username ? user.username.charAt(0).toUpperCase() : 'U';

  const getRoleBadgeLabel = (role) => {
    switch (role) {
      case 'admin': return 'Gov Admin';
      case 'site_manager': return 'Site Manager';
      case 'emergency_service': return 'First Responder';
      case 'visitor': return 'Visitor / Pilgrim';
      default: return 'Security Officer';
    }
  };

  return (
    <aside 
      className="sidebar"
      style={{ 
        width: isCollapsed ? '80px' : '280px',
        padding: isCollapsed ? '25px 10px' : '25px 15px'
      }}
    >
      {/* Top Brand Logo & Toggler */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: isCollapsed ? 'center' : 'space-between',
        marginBottom: '20px',
        padding: '0 5px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={26} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
          {!isCollapsed && <span className="sidebar-logo-text">CROWDGUARD</span>}
        </div>
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            marginLeft: isCollapsed ? '0' : '10px'
          }}
          className="btn-collapse-toggle"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Main Menu Links */}
      <nav className="sidebar-menu">
        {menuItems.map(item => {
          const IconComponent = item.icon;
          const is3D = item.id === 'whatif-simulator';
          return (
            <div
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
              style={{
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: isCollapsed ? '12px' : '10px 14px',
                position: 'relative',
                background: is3D 
                  ? (activeTab === item.id ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.35) 0%, rgba(168, 85, 247, 0.35) 100%)' : 'rgba(6, 182, 212, 0.12)') 
                  : undefined,
                border: is3D ? '1px solid rgba(6, 182, 212, 0.5)' : undefined,
                boxShadow: is3D ? '0 0 12px rgba(6, 182, 212, 0.25)' : undefined,
                borderRadius: '10px',
                marginBottom: '4px'
              }}
              title={isCollapsed ? item.name : undefined}
            >
              <IconComponent size={18} style={{ flexShrink: 0, color: is3D ? '#38bdf8' : undefined }} />
              {!isCollapsed && <span style={{ fontSize: '13px', fontWeight: is3D ? 800 : 500, color: is3D ? '#38bdf8' : undefined }}>{item.name}</span>}
              {!isCollapsed && is3D && (
                <span style={{ marginLeft: 'auto', fontSize: '9px', fontWeight: 800, background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)', color: '#ffffff', padding: '2px 6px', borderRadius: '6px', letterSpacing: '0.5px' }}>
                  3D LIVE
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Profile Details */}
      <div className="sidebar-footer">
        {/* Theme Toggle Button */}
        <div 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="sidebar-link"
          style={{ 
            cursor: 'pointer',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            padding: isCollapsed ? '10px' : '10px 14px',
            border: '1px solid var(--border-color)'
          }}
          title={isCollapsed ? `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode` : undefined}
        >
          {theme === 'dark' ? (
            <Sun size={18} style={{ color: '#fbbf24', flexShrink: 0 }} />
          ) : (
            <Moon size={18} style={{ color: '#3b82f6', flexShrink: 0 }} />
          )}
          {!isCollapsed && <span style={{ fontSize: '13px' }}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </div>

        <div className="user-profile-section" style={{ 
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          padding: '5px 0',
          marginTop: '8px'
        }}>
          <div className="user-avatar" style={{ flexShrink: 0 }}>
            {firstLetter}
          </div>
          {!isCollapsed && (
            <div className="user-details">
              <span className="user-name">{user?.username || 'User'}</span>
              <span className="user-role" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                {user?.role_display || getRoleBadgeLabel(userRole)}
              </span>
            </div>
          )}
        </div>

        <div 
          onClick={logout}
          className="sidebar-link"
          style={{ 
            color: 'var(--risk-critical)', 
            background: 'rgba(239, 68, 68, 0.02)', 
            borderColor: 'rgba(239, 68, 68, 0.05)',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            padding: isCollapsed ? '10px' : '10px 14px',
            marginTop: '8px'
          }}
          title={isCollapsed ? "Logout Session" : undefined}
        >
          <LogOut size={18} style={{ flexShrink: 0 }} />
          {!isCollapsed && <span style={{ fontSize: '13px' }}>Logout Session</span>}
        </div>
      </div>
    </aside>
  );
};

const MainAppContent = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  // Set default initial active tab based on user role upon login
  useEffect(() => {
    if (user?.role) {
      switch (user.role) {
        case 'visitor':
          setActiveTab('visitor-guidance');
          break;
        case 'emergency_service':
          setActiveTab('emergency-services');
          break;
        case 'site_manager':
        case 'security_officer':
        case 'admin':
          setActiveTab('dashboard');
          break;
        default:
          setActiveTab('dashboard');
      }
    }
  }, [user?.role]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        flexDirection: 'column',
        gap: '15px'
      }}>
        <div className="pulsing-dot" style={{ width: '16px', height: '16px' }} />
        <span>Authenticating Role-Based Core...</span>
      </div>
    );
  }

  // If not logged in, return login page
  if (!user) {
    return <Login />;
  }

  // Render tab pages
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'whatif-simulator':
        return <WhatIfSimulator />;
      case 'safe-visit':
        return <SafeVisit />;
      case 'pilgrim-safe-ai':
        return <PilgrimSafeAI />;
      case 'spatial-map':
        return <SpatialMap />;
      case 'satellite-analytics':
        return <SatelliteAnalytics />;
      case 'incidents-forecasting':
        return <IncidentsAndForecasting />;

      case 'emergency-services':
        return <EmergencyServices />;
      case 'visitor-guidance':
        return <VisitorGuidanceAndPrivacy />;
      case 'history-3d-model':
        return <HistoryAnd3DModel />;
      case 'cameras':
        return <CameraManagement />;
      case 'image-detection':
        return <ImageAnalysis />;
      case 'events':
        return <EventHistory />;
      case 'reports':
        return <Reports />;
      case 'audit-logs':
        return <AuditLogs />;
      case 'admin':
        return <AdminPanel />;
      default:
        return user?.role === 'visitor' ? <VisitorGuidanceAndPrivacy /> : <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <NavigationSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed} 
        theme={theme}
        setTheme={setTheme}
      />
      <main 
        className="main-content"
        style={{ 
          marginLeft: isSidebarCollapsed ? '110px' : '310px', 
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          padding: '25px 30px 40px 15px'
        }}
      >
        {/* Top Header Status & Active Persona Indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setActiveTab('whatif-simulator')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: activeTab === 'whatif-simulator' 
                  ? 'linear-gradient(135deg, #06b6d4 0%, #a855f7 100%)' 
                  : 'linear-gradient(135deg, rgba(6, 182, 212, 0.18) 0%, rgba(168, 85, 247, 0.18) 100%)',
                border: '1px solid var(--accent-cyan)',
                boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)',
                color: '#ffffff',
                padding: '7px 16px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Open Interactive 3D Digital Twin & What-If Safety Simulator"
            >
              <Cpu size={15} style={{ color: '#38bdf8' }} />
              <span>🌐 3D DIGITAL TWIN & WHAT-IF SIMULATOR</span>
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px'
            }}>
              <UserCheck size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>Active Persona: <strong style={{ color: 'var(--accent-cyan)' }}>{user.role_display || user.role.toUpperCase()}</strong></span>
            </div>
          </div>

          <OfflineIndicator />
        </div>

        {renderTabContent()}
      </main>

      {/* GLOBAL AI SEVAYAT PANDITJI COMPANION WIDGET (Excluded from Admin Portal) */}
      {user?.role !== 'admin' && activeTab !== 'admin' && (
        <AIPanditjiAssistantWidget activeTab={activeTab} />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

export default App;
