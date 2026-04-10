import React from 'react';
import { Bell, Search, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Topbar.css';

interface TopbarProps {
  onMenuClick: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const { logout } = useAuth();

  return (
    <header className="topbar">
      <button className="mobile-menu-btn" onClick={onMenuClick}>
        <Menu size={24} />
      </button>

      <div className="search-bar glass-panel">
        <Search size={18} className="text-muted" />
        <input type="text" placeholder="Buscar clientes..." />
      </div>

      <div className="topbar-actions">
        <button className="icon-btn">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>
        <button className="btn btn-outline logout-btn" onClick={logout}>
          <LogOut size={16} />
          <span className="btn-text">Salir</span>
        </button>
      </div>
    </header>
  );
};
