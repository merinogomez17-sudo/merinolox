import React from 'react';
import { Bell, Search, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Topbar.css';

export const Topbar: React.FC = () => {
  const { logout } = useAuth();

  return (
    <header className="topbar">
      <div className="search-bar glass-panel">
        <Search size={18} className="text-muted" />
        <input type="text" placeholder="Buscar clientes, contactos, empresas..." />
      </div>

      <div className="topbar-actions">
        <button className="icon-btn">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>
        <button className="btn btn-outline" onClick={logout}>
          <LogOut size={16} />
          <span>Salir</span>
        </button>
      </div>
    </header>
  );
};
