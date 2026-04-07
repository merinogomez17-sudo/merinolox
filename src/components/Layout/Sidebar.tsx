import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">FM</div>
          <span className="logo-text">Flexomarket</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <NavLink 
          to="/" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        
        <NavLink 
          to="/clients" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Users size={20} />
          <span>Mis Clientes</span>
        </NavLink>

        {user?.role === 'admin' && (
          <NavLink 
            to="/users" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <UserCircle size={20} />
            <span>Usuarios (Admin)</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="avatar">{user?.name.charAt(0)}</div>
          <div className="details">
            <div className="name">{user?.name}</div>
            <div className="role tag">{user?.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
