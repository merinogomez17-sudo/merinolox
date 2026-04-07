import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, UserCheck, KeyRound, X, Search } from 'lucide-react';
import './UsersList.css';

export const UsersList: React.FC = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [clientCounts, setClientCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Modal de rendimiento (Modo Espía)
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userClients, setUserClients] = useState<any[]>([]);
  const [loadingModal, setLoadingModal] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Fetch profiles
    const { data: profilesData, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (profError) {
      console.error('Error fetching profiles', profError);
    } else {
      setProfiles(profilesData || []);
    }

    // 2. Fetch client counts (actividad general)
    const { data: clientsData } = await supabase
      .from('clients')
      .select('vendedor_id');

    if (clientsData) {
      const counts: Record<string, number> = {};
      clientsData.forEach(client => {
        if (client.vendedor_id) {
          counts[client.vendedor_id] = (counts[client.vendedor_id] || 0) + 1;
        }
      });
      setClientCounts(counts);
    }

    setLoading(false);
  };

  useEffect(() => {
    // Only fetch if admin
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Prevent modifying oneself to avoid lockouts temporarily
    if (userId === user?.id) {
      alert("No puedes quitarte los permisos de admin a ti mismo desde aquí por seguridad.");
      return;
    }

    // Update DB
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error("Error updating role", error);
      alert("Error al actualizar permisos. Revisa la consola.");
      fetchData(); // Rollback local UI
    } else {
      // Optimistic update
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
    }
  };

  const openPerfModal = async (profile: any) => {
    setSelectedUser(profile);
    setLoadingModal(true);
    
    // Query aislada filtrada estrictamente por este vendedor
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('vendedor_id', profile.id)
      .order('created_at', { ascending: false });
      
    if (!error) {
      setUserClients(data || []);
    }
    setLoadingModal(false);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Desconocido';
    const date = new Date(isoString);
    return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="users-page animate-fade-in">
        <div className="access-denied glass-panel">
          <ShieldAlert size={48} className="danger" />
          <h2>Acceso Denegado</h2>
          <p>Esta sección es exclusiva para administradores de área.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Gestión de Usuarios (Admin)</h1>
          <p className="text-muted">Controla quiénes tienen acceso al sistema y monitorea el volumen de clientes que manejan.</p>
        </div>
        <div className="actions">
          <div className="stat-pill">
             <UserCheck size={16} /> Total Personal: {profiles.length}
          </div>
        </div>
      </div>

      <div className="native-table-container glass-panel">
        {loading && <div className="loading-overlay">Cargando Personal...</div>}
        
        <table className="custom-spreadsheet">
          <thead>
            <tr>
               <th>Usuario / Nombre</th>
               <th>ID del Sistema</th>
               <th>Fecha de Alta</th>
               <th>Actividad</th>
               <th>Nivel de Acceso</th>
               <th>Acciones (Admin)</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map(profile => (
              <tr key={profile.id} className={profile.id === user?.id ? 'row-self' : ''}>
                <td style={{ fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {profile.id === user?.id && <KeyRound size={14} className="accent-text" />}
                    {profile.full_name || 'Usuario Sin Nombre'}
                    {profile.id === user?.id && <span className="tag minimal">Tú</span>}
                  </div>
                </td>
                <td className="text-muted" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {profile.id.split('-')[0]}...
                </td>
                <td>{formatDate(profile.created_at)}</td>
                <td>
                   <span className="activity-badge">
                     {clientCounts[profile.id] || 0} bases
                   </span>
                </td>
                <td>
                  <select 
                    className="role-selector"
                    value={profile.role}
                    onChange={e => handleRoleChange(profile.id, e.target.value)}
                    disabled={profile.id === user?.id} // Cannot change own role
                  >
                    <option value="vendedor">Vendedor Estándar</option>
                    <option value="admin">Administrador</option>
                  </select>
                </td>
                <td>
                  <button className="btn btn-outline small-btn" onClick={() => openPerfModal(profile)}>
                    <Search size={14} style={{ marginRight: '4px' }} /> Rendimiento
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Dashboard del Vendedor (Modo Espía) */}
      {selectedUser && (
        <div className="perf-modal-overlay">
          <div className="perf-modal-content glass-panel animate-scale-in">
            <div className="modal-header">
               <div>
                 <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Dashboard de {selectedUser.full_name || 'Vendedor'}</h2>
                 <p className="text-muted" style={{ fontSize: '0.85rem' }}>Vista aislada de sus métricas de venta y seguimiento.</p>
               </div>
              <button className="close-btn" onClick={() => setSelectedUser(null)}>
                <X size={24} />
              </button>
            </div>
            
            {loadingModal ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>Escaneando base de datos del usuario...</div>
            ) : (
              <div className="perf-modal-body">
                 {/* Mini Stats (Como el Dashboard principal pero filtrado) */}
                 <div className="mini-stats-grid">
                   <div className="mini-stat-card">
                      <h3>Total Asignados</h3>
                      <span className="bignum">{userClients.length}</span>
                   </div>
                   <div className="mini-stat-card blue-tint">
                      <h3>Cotizando</h3>
                      <span className="bignum">{userClients.filter(c => c.status === 'cotización').length}</span>
                   </div>
                   <div className="mini-stat-card green-tint">
                      <h3>Cierres Listos</h3>
                      <span className="bignum">{userClients.filter(c => c.status === 'cierre').length}</span>
                   </div>
                   <div className="mini-stat-card red-tint">
                      <h3>Perdidos</h3>
                      <span className="bignum">{userClients.filter(c => c.status === 'perdido').length}</span>
                   </div>
                 </div>

                 {/* Tabla miniatura de sus clientes */}
                 <h3 className="section-title" style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1rem', color: '#94a3b8' }}>
                   Clientes Bajo su Gestión (Top Recientes)
                 </h3>
                 <div className="mini-table-container">
                   <table className="custom-spreadsheet mini">
                     <thead>
                       <tr>
                         <th>Empresa</th>
                         <th>Contacto Principal</th>
                         <th>Fecha Creado</th>
                         <th>Estado Actual</th>
                       </tr>
                     </thead>
                     <tbody>
                       {userClients.length === 0 ? (
                         <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Este usuario no ha registrado ningún cliente aún.</td></tr>
                       ) : userClients.map(c => (
                         <tr key={c.id}>
                           <td style={{ fontWeight: 600, color: 'white' }}>{c.company_name || 'Sin Nombre'}</td>
                           <td>{c.contact_name || '--'}</td>
                           <td>{formatDate(c.created_at)}</td>
                           <td><span className="status-badge" data-status={c.status}>{c.status}</span></td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
