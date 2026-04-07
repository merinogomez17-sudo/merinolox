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

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('clients')
        .select('status')
        .eq('vendedor_id', user.id);
      
      if (data) {
        setTotalClientes(data.length);
        setCotizaciones(data.filter(c => c.status === 'cotización').length);
        setInactivos(data.filter(c => c.status === 'perdido' || c.status === null).length);
        setContactosInicial(data.filter(c => c.status === 'contacto inicial').length);
      }
    };
    fetchData();
  }, [user]);

  // Simulación de gráfico (idealmente agruparías por mes desde DB)
  const MOCK_DATA = [
    { name: 'Alta', cantidad: totalClientes },
    { name: 'Contactos', cantidad: contactosInicial },
    { name: 'Cotizando', cantidad: cotizaciones },
    { name: 'Inactivos', cantidad: inactivos },
  ];

  return (
    <div className="dashboard animate-fade-in">
      <div className="dashboard-header">
        <h1>Dashboard Personal</h1>
        <p className="text-muted">
          Resumen de tus prospectos y actividades asignadas.
        </p>
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

        <div className="stat-card glass-panel">
          <div className="stat-icon danger">
            <AlertCircle size={24} />
          </div>
          <div className="stat-details">
            <h3>Perdidos/Inactivos</h3>
            <span className="stat-value">{inactivos}</span>
            <span className="stat-trend negative">Revisión requerida</span>
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
