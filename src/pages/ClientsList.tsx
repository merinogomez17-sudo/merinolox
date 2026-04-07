import React, { useState, useEffect, useCallback } from 'react';
import { Download, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './ClientsList.css';

export const ClientsList: React.FC = () => {
  const { user } = useAuth();
  const [rowData, setRowData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({
    company_name: '', industry: '', contact_name: '', email: '', phone: '', status: 'contacto inicial', notes: ''
  });

  // Fetch clients
  const loadClients = async () => {
    setLoading(true);
    if (!user) return;

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('vendedor_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching clients', error);
    } else {
      setRowData(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Sync edits to state locally for typing speed, save on blur
  const updateLocalState = (id: string, field: string, value: string) => {
    setRowData(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleBlurSave = async (id: string, field: string, value: string) => {
    const { error } = await supabase
      .from('clients')
      .update({ [field]: value })
      .eq('id', id);

    if (error) {
      console.error('Error updating cell', error);
      loadClients();
    }
  };

  // Exportar CSV
  const handleExport = useCallback(() => {
    if (rowData.length === 0) return;
    const headers = ['Empresa', 'Giro', 'Contacto', 'Email', 'Teléfono', 'Estado', 'Primer Contacto', 'Notas'];
    const csvContent = [
      headers.join(','),
      ...rowData.map(row => [
        `"${row.company_name || ''}"`,
        `"${row.industry || ''}"`,
        `"${row.contact_name || ''}"`,
        `"${row.email || ''}"`,
        `"${row.phone || ''}"`,
        `"${row.status || ''}"`,
        `"${row.first_contact_date || ''}"`,
        `"${row.notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'mis_clientes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [rowData]);

  const submitNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const newClient = {
      ...newClientData,
      vendedor_id: user?.id,
    };

    const { data, error } = await supabase
      .from('clients')
      .insert([newClient])
      .select()
      .single();

    if (error) {
      alert('Error: No se pudo crear al cliente. Verifica tus permisos.');
    } else if (data) {
      setRowData([data, ...rowData]); // Añadimos arriba de la lista
      setIsModalOpen(false);
      setNewClientData({company_name: '', industry: '', contact_name: '', email: '', phone: '', status: 'contacto inicial', notes: ''});
    }
  };

  return (
    <div className="clients-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Base Principal ({rowData.length} registros cargados)</h1>
          <p className="text-muted">Gestiona tus contactos. Puedes editar dándole click directamente a cada celda.</p>
        </div>
        <div className="actions">
          <button className="btn btn-outline" onClick={handleExport}>
            <Download size={16} /> Exportar CSV
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="native-table-container glass-panel">
        {loading && <div className="loading-overlay">Cargando...</div>}
        
        <table className="custom-spreadsheet">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Giro</th>
              <th>Contacto</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Notas Extras</th>
            </tr>
          </thead>
          <tbody>
            {rowData.map(client => (
              <tr key={client.id}>
                <td>
                  <input 
                    type="text" 
                    value={client.company_name || ''} 
                    onChange={e => updateLocalState(client.id, 'company_name', e.target.value)}
                    onBlur={e => handleBlurSave(client.id, 'company_name', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    value={client.industry || ''} 
                    onChange={e => updateLocalState(client.id, 'industry', e.target.value)}
                    onBlur={e => handleBlurSave(client.id, 'industry', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    value={client.contact_name || ''} 
                    onChange={e => updateLocalState(client.id, 'contact_name', e.target.value)}
                    onBlur={e => handleBlurSave(client.id, 'contact_name', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    value={client.email || ''} 
                    onChange={e => updateLocalState(client.id, 'email', e.target.value)}
                    onBlur={e => handleBlurSave(client.id, 'email', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    value={client.phone || ''} 
                    onChange={e => updateLocalState(client.id, 'phone', e.target.value)}
                    onBlur={e => handleBlurSave(client.id, 'phone', e.target.value)}
                  />
                </td>
                <td>
                  <select 
                    value={client.status || 'contacto inicial'}
                    onChange={e => {
                      updateLocalState(client.id, 'status', e.target.value);
                      handleBlurSave(client.id, 'status', e.target.value);
                    }}
                  >
                    <option value="contacto inicial">Contacto Inicial</option>
                    <option value="seguimiento">Seguimiento</option>
                    <option value="cotización">Cotización</option>
                    <option value="cierre">Cierre</option>
                    <option value="perdido">Perdido</option>
                  </select>
                </td>
                <td>
                  <input 
                    type="text" 
                    value={client.notes || ''} 
                    onChange={e => updateLocalState(client.id, 'notes', e.target.value)}
                    onBlur={e => handleBlurSave(client.id, 'notes', e.target.value)}
                    placeholder="Notas o comentarios..."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-scale-in">
            <div className="modal-header">
              <h2><Plus size={24} className="icon-accent" /> Alta de Nuevo Cliente</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={submitNewClient} className="premium-form">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Nombre de la Empresa *</label>
                  <input 
                    type="text" 
                    className="input premium-input" 
                    required
                    value={newClientData.company_name}
                    onChange={e => setNewClientData({...newClientData, company_name: e.target.value})}
                    placeholder="Ej. Flexomarket S.A. de C.V."
                  />
                </div>
                
                <div className="form-group">
                  <label>Nombre de Contacto</label>
                  <input 
                    type="text" 
                    className="input premium-input" 
                    value={newClientData.contact_name}
                    onChange={e => setNewClientData({...newClientData, contact_name: e.target.value})}
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                
                <div className="form-group">
                  <label>Giro (Industria)</label>
                  <input 
                    type="text" 
                    className="input premium-input" 
                    value={newClientData.industry}
                    onChange={e => setNewClientData({...newClientData, industry: e.target.value})}
                    placeholder="Ej. Ingeniería"
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono</label>
                  <input 
                    type="text" 
                    className="input premium-input" 
                    value={newClientData.phone}
                    onChange={e => setNewClientData({...newClientData, phone: e.target.value})}
                    placeholder="55 1234 5678"
                  />
                </div>
                
                <div className="form-group">
                  <label>Email</label>
                  <input 
                    type="email" 
                    className="input premium-input" 
                    value={newClientData.email}
                    onChange={e => setNewClientData({...newClientData, email: e.target.value})}
                    placeholder="ventas@empresa.com"
                  />
                </div>
                
                <div className="form-group">
                  <label>Estado Inicial</label>
                  <div className="select-wrapper">
                    <select 
                      className="input premium-input"
                      value={newClientData.status}
                      onChange={e => setNewClientData({...newClientData, status: e.target.value})}
                    >
                      <option value="contacto inicial">Contacto Inicial</option>
                      <option value="seguimiento">Seguimiento</option>
                      <option value="cotización">Cotización</option>
                      <option value="cierre">Cierre</option>
                      <option value="perdido">Perdido</option>
                    </select>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Notas Extra</label>
                  <input 
                    type="text" 
                    className="input premium-input" 
                    value={newClientData.notes}
                    onChange={e => setNewClientData({...newClientData, notes: e.target.value})}
                    placeholder="Escribe comentarios, siguientes pasos..."
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary pulse-hover">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
