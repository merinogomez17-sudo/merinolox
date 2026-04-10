import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, TrendingUp, PhoneCall, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [totalClientes, setTotalClientes] = useState(0);
  const [cotizaciones, setCotizaciones] = useState(0);
  const [inactivos, setInactivos] = useState(0);
  const [contactosInicial, setContactosInicial] = useState(0);
  const [seguimientoPendiente, setSeguimientoPendiente] = useState(0);
  
  // New State for Admin Filtering
  const [vendedoresList, setVendedoresList] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('total');

  // Fetch Vendedores (Admins only)
  useEffect(() => {
    if (isAdmin) {
      const fetchVendedores = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .order('full_name');
        setVendedoresList(data || []);
      };
      fetchVendedores();
    }
  }, [isAdmin]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      let query = supabase.from('clients').select('status, last_contact_date, vendedor_id');
      
      // LOGIC:
      // If Vendedor: Always filter by their own ID
      // If Admin: Filter by selectedUserId (if not 'total')
      if (user.role !== 'admin') {
        query = query.eq('vendedor_id', user.id);
      } else if (selectedUserId !== 'total') {
        query = query.eq('vendedor_id', selectedUserId);
      }
      
      const { data } = await query;
      
      if (data) {
        setTotalClientes(data.length);
        setCotizaciones(data.filter(c => c.status === 'cotización').length);
        setInactivos(data.filter(c => c.status === 'perdido' || c.status === null).length);
        setContactosInicial(data.filter(c => c.status === 'contacto inicial').length);
        
        // Count clients with more than 7 days of inactivity
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const pending = data.filter(c => {
          if (!c.last_contact_date) return true; // Never contacted = pending
          return new Date(c.last_contact_date) < sevenDaysAgo;
        }).length;
        
        setSeguimientoPendiente(pending);
      }
    };
    fetchData();
  }, [user, selectedUserId, isAdmin]);

  // Simulación de gráfico (idealmente agruparías por mes desde DB)
  const MOCK_DATA = [
    { name: 'Alta', cantidad: totalClientes },
    { name: 'Pendientes', cantidad: seguimientoPendiente },
    { name: 'Cotizando', cantidad: cotizaciones },
    { name: 'Inactivos', cantidad: inactivos },
  ];

  return (
    <div className="dashboard animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard {selectedUserId === 'total' ? 'Global' : 'Personal'}</h1>
          <p className="text-muted">
            {selectedUserId === 'total' 
              ? 'Resumen global de todos los prospectos y actividades de la empresa.' 
              : 'Resumen de los prospectos y actividades asignadas.'}
          </p>
        </div>

        {isAdmin && (
          <div className="admin-controls glass-panel">
            <label>Filtrar por Usuario:</label>
            <select 
              value={selectedUserId} 
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="user-selector"
            >
              <option value="total">📊 Ver Total Global</option>
              {vendedoresList.map(v => (
                <option key={v.id} value={v.id}>
                  👤 {v.full_name} ({v.role})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon info">
            <Users size={24} />
          </div>
          <div className="stat-details">
            <h3>Total Clientes</h3>
            <span className="stat-value">{totalClientes}</span>
            <span className="stat-trend neutral">En sistema</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon success">
            <TrendingUp size={24} />
          </div>
          <div className="stat-details">
            <h3>En Cotización</h3>
            <span className="stat-value">{cotizaciones}</span>
            <span className="stat-trend positive">Avanzando</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon warning">
            <PhoneCall size={24} />
          </div>
          <div className="stat-details">
            <h3>Contacto Inicial</h3>
            <span className="stat-value">{contactosInicial}</span>
            <span className="stat-trend neutral">Por contactar</span>
          </div>
        </div>

        <div className="stat-card glass-panel highlight-stat">
          <div className="stat-icon warning">
            <AlertCircle size={24} />
          </div>
          <div className="stat-details">
            <h3>Seguimiento Pendiente</h3>
            <span className="stat-value">{seguimientoPendiente}</span>
            <span className="stat-trend negative">+7 días sin hablar</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card glass-panel">
          <h2>Embudo de Estatus</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_DATA}>
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#111827', borderColor: '#334155'}} />
                <Bar dataKey="cantidad" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
