import React, { useState, useEffect, useCallback } from 'react';
import { Download, Plus, X, AlertTriangle, Trash2, Upload, Filter, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { triggerN8nWebhook } from '../lib/webhookUtils';
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
    company_name: '', 
    industry: '', 
    contact_name: '', 
    email: '', 
    phone: '', 
    status: 'contacto inicial', 
    notes: '',
    follow_up: '',
    reminder_date: '',
    reminder_note: '',
    reminder_active: false,
    first_contact_date: new Date().toISOString().split('T')[0]
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [importLoading, setImportLoading] = useState(false);

  const [initialValue, setInitialValue] = useState<string | null>(null);

  // Filter State
  const [filters, setFilters] = useState<Record<string, string>>({
    company_name: '',
    industry: '',
    contact_name: '',
    email: '',
    phone: '',
    status: '',
    vendedor: '',
    notes: '',
    follow_up: '',
    reminder_note: '',
    categoryFilter: 'all'
  });

  const [activeFilterPopup, setActiveFilterPopup] = useState<string | null>(null);

  // Click outside listener for popups
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.filter-popup') && 
          !(e.target as HTMLElement).closest('.filter-trigger')) {
        setActiveFilterPopup(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysSinContacto = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      // Use UTC to avoid timezone shifts during calculation
      const last = new Date(dateStr);
      const today = new Date();
      
      // Normalize both to midnight UTC for precise day difference
      const lastUtc = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
      const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
      
      const diffTime = todayUtc - lastUtc;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 ? diffDays : 0;
    } catch (e) {
      console.error('Error calculating days:', e);
      return '-';
    }
  };

  const getRowClass = (status: string, lastContact: string) => {
    const days = getDaysSinContacto(lastContact);
    if (typeof days === 'number' && days >= 7) return 'row-abandoned';
    if (status === 'perdido') return 'row-perdido';
    if (status === 'cierre' || status === 'cotización') return 'row-interes';
    return '';
  };

  // Filtered Logic
  const filteredRows = React.useMemo(() => {
    return rowData.filter(row => {
      const matchCompany = !filters.company_name || row.company_name?.toLowerCase().includes(filters.company_name.toLowerCase());
      const matchIndustry = !filters.industry || row.industry?.toLowerCase().includes(filters.industry.toLowerCase());
      const matchContact = !filters.contact_name || row.contact_name?.toLowerCase().includes(filters.contact_name.toLowerCase());
      const matchEmail = !filters.email || row.email?.toLowerCase().includes(filters.email.toLowerCase());
      const matchPhone = !filters.phone || row.phone?.toLowerCase().includes(filters.phone.toLowerCase());
      const matchStatus = !filters.status || row.status === filters.status;
      const matchVendedor = !filters.vendedor || row.profiles?.full_name?.toLowerCase().includes(filters.vendedor.toLowerCase());
      const matchNotes = !filters.notes || row.notes?.toLowerCase().includes(filters.notes.toLowerCase());
      const matchFollowUp = !filters.follow_up || row.follow_up?.toLowerCase().includes(filters.follow_up.toLowerCase());
      const matchReminder = !filters.reminder_note || row.reminder_note?.toLowerCase().includes(filters.reminder_note.toLowerCase());
      
      // Category (Color) Logic
      let matchCategory = true;
      if (filters.categoryFilter !== 'all') {
        const days = getDaysSinContacto(row.last_contact_date);
        if (filters.categoryFilter === 'abandoned') {
          matchCategory = typeof days === 'number' && days >= 7;
        } else if (filters.categoryFilter === 'lost') {
          matchCategory = row.status === 'perdido';
        } else if (filters.categoryFilter === 'interested') {
          matchCategory = (row.status === 'cierre' || row.status === 'cotización') && (typeof days !== 'number' || days < 7);
        }
      }

      return matchCompany && matchIndustry && matchContact && matchEmail && matchPhone && 
             matchStatus && matchVendedor && matchNotes && matchFollowUp && matchReminder && matchCategory;
    });
  }, [rowData, filters]);

  // Fetch clients
  const loadClients = async () => {
    setLoading(true);
    if (!user) return;

    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        profiles (
          full_name
        )
      `)
      .eq('vendedor_id', user.id)
      .order('last_contact_date', { ascending: true, nullsFirst: true });
    
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
  const updateLocalState = (id: string, field: string, value: any) => {
    setRowData(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleBlurSave = async (id: string, field: string, value: any, forcedInitialValue?: string) => {
    // For checkboxes or immediate fields, we might pass a forcedInitialValue to avoid async state issues
    const effectiveInitialValue = forcedInitialValue !== undefined ? forcedInitialValue : initialValue;
    
    // Only save and notify if we have a valid initial value and it has changed
    if (effectiveInitialValue === null || value === effectiveInitialValue) return;

    const isActivity = ['notes', 'follow_up', 'status'].includes(field);
    const updateData: any = { [field]: value };
    
    if (isActivity) {
      updateData.last_contact_date = new Date().toISOString();
    }

    const { error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating cell', error);
      loadClients();
    } else if (isActivity) {
      // Immediate local update for better UX
      const now = new Date().toISOString();
      setRowData(prev => prev.map(r => (r.id === id ? { ...r, last_contact_date: now } : r)));

      // Find the client in the current state to get full info for the webhook
      const client = rowData.find(c => c.id === id);
      
      // NEW CATEGORIZATION:
      let type: 1 | 2 | 3 | 4 | 5 = 2; 
      if (field === 'status') {
        type = 3;
      } else if (field === 'notes' || field === 'follow_up') {
        type = 4;
      } else if (field.startsWith('reminder_')) {
        type = 5;
      }

      // Notify n8n
      triggerN8nWebhook(type, { 
        client_info: {
          id: id,
          company_name: client?.company_name,
          contact_name: client?.contact_name,
          email: client?.email,
          phone: client?.phone,
          industry: client?.industry,
          vendedor: client?.profiles?.full_name
        },
        change_details: {
          field: field,
          old_value: initialValue || '--',
          new_value: value,
          date_of_change: now
        }
      });
      
      // Sorting is handled by the data fetch, but we keep local state for speed
    }
    
    // Reset initial value after saving
    setInitialValue(null);
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar a "${name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting client:', error);
      alert('Error: No se pudo eliminar al cliente.');
    } else {
      // Remover de la lista local
      setRowData(prev => prev.filter(c => c.id !== id));
    }
  };

  // Exportar CSV
  const handleExport = useCallback(() => {
    if (filteredRows.length === 0) return;
    const headers = [
      'Vendedor', 
      'Empresa', 
      'Giro', 
      'Contacto', 
      'Email', 
      'Teléfono', 
      'Estado', 
      'Fecha Inicio', 
      'Fecha Actualizada', 
      'Inactivos (Días)', 
      'Notas', 
      'Seguimiento Extra', 
      'Fecha Rec.', 
      'Nota Rec.', 
      'Recordatorio Activo'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredRows.map(row => [
        `"${row.profiles?.full_name || 'Sin asignar'}"`,
        `"${row.company_name || ''}"`,
        `"${row.industry || ''}"`,
        `"${row.contact_name || ''}"`,
        `"${row.email || ''}"`,
        `"${row.phone || ''}"`,
        `"${row.status || ''}"`,
        `"${row.first_contact_date || ''}"`,
        `"${row.last_contact_date ? new Date(row.last_contact_date).toLocaleDateString() : '---'}"`,
        `"${getDaysSinContacto(row.last_contact_date)}"`,
        `"${row.notes || ''}"`,
        `"${row.follow_up || ''}"`,
        `"${row.reminder_date || ''}"`,
        `"${row.reminder_note || ''}"`,
        `"${row.reminder_active ? 'SÍ' : 'NO'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `mis_clientes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredRows]);

  const submitNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const newClient = {
      ...newClientData,
      vendedor_id: user?.id,
    };

    const { data, error } = await supabase
      .from('clients')
      .insert([{
        ...newClientData,
        vendedor_id: user?.id,
        last_contact_date: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      alert(`Error: ${error.message || 'No se pudo crear al cliente. Verifica tus permisos.'}`);
    } else if (data) {
      setRowData([data, ...rowData]); // Añadimos arriba de la lista
      
      // Notify n8n TYPE 2 (New Client) - SEND FULL INFO
      triggerN8nWebhook(2, { 
        client_info: {
          id: data.id,
          ...newClientData,
          vendedor_id: user.id
        },
        change_details: {
          field: 'all (creation)',
          old_value: 'null',
          new_value: 'created',
          date_of_change: new Date().toISOString()
        }
      });
      
      setIsModalOpen(false);
      setNewClientData({
        company_name: '', 
        industry: '', 
        contact_name: '', 
        email: '', 
        phone: '', 
        status: 'contacto inicial', 
        notes: '',
        follow_up: '',
        first_contact_date: new Date().toISOString().split('T')[0]
      });
    }
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setImportLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const data = XLSX.utils.sheet_to_json(ws, { header: hasHeaders ? 0 : 1 });
        
        if (data.length === 0) {
          alert('El archivo está vacío.');
          setImportLoading(false);
          return;
        }

        const { data: existingClients } = await supabase
          .from('clients')
          .select('company_name')
          .eq('vendedor_id', user.id);
        
        const existingNames = new Set(existingClients?.map(c => c.company_name?.toLowerCase().trim()) || []);
        const clientsToInsert: any[] = [];
        
        data.forEach((row: any) => {
          let company_name = '';
          let industry = '';
          let contact_name = '';
          let email = '';
          let phone = '';
          let status = 'contacto inicial';
          let first_contact_date = new Date().toISOString().split('T')[0];
          let notes = '';
          let follow_up = '';

          if (hasHeaders) {
            company_name = row['Empresa'] || row['company_name'] || row['Nombre'] || '';
            industry = row['Giro'] || row['industry'] || '';
            contact_name = row['Contacto'] || row['contact_name'] || '';
            email = row['Email'] || row['email'] || '';
            phone = row['Teléfono'] || row['phone'] || '';
            status = row['Estado'] || row['status'] || 'contacto inicial';
            first_contact_date = row['Fecha'] || row['first_contact_date'] || first_contact_date;
            notes = row['Notas'] || row['notes'] || '';
            follow_up = row['Seguimiento'] || row['follow_up'] || '';
          } else {
            company_name = row[0] || '';
            industry = row[1] || '';
            contact_name = row[2] || '';
            email = row[3] || '';
            phone = row[4] || '';
            status = row[5] || 'contacto inicial';
            first_contact_date = row[6] || first_contact_date;
            notes = row[7] || '';
            follow_up = row[8] || '';
          }

          const cleanName = company_name.toString().trim();
          if (cleanName && !existingNames.has(cleanName.toLowerCase())) {
            const now = new Date().toISOString();
            clientsToInsert.push({
              company_name: cleanName,
              industry,
              contact_name,
              email,
              phone,
              status: status.toLowerCase(),
              first_contact_date,
              last_contact_date: now, // Initialize this!
              notes,
              follow_up,
              vendedor_id: user.id
            });
            existingNames.add(cleanName.toLowerCase());
          }
        });

        if (clientsToInsert.length === 0) {
          alert('No hay clientes nuevos para importar (todos los nombres de empresa ya existen).');
        } else {
          const { error } = await supabase.from('clients').insert(clientsToInsert);
          if (error) {
            console.error('Error in batch insert:', error);
            alert('Error al realizar la carga masiva.');
          } else {
            alert(`¡Éxito! Se importaron ${clientsToInsert.length} clientes nuevos.`);
            loadClients();
          }
        }
      } catch (err) {
        console.error('Error parsing CSV:', err);
        alert('Error al leer el archivo. Asegúrate de que sea un CSV válido.');
      }
      setImportLoading(false);
      setIsImportModalOpen(false);
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="clients-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Base Principal ({rowData.length} registros cargados)</h1>
          <p className="text-muted">Gestiona tus contactos. Puedes editar dándole click directamente a cada celda.</p>
        </div>
        <div className="actions">
        <div className="table-actions">
        <div className="left-actions">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={20} /> Nuevo Cliente
          </button>
          
          <div className="category-select-wrapper">
             <Filter size={16} className="select-icon" />
             <select 
               className="category-selector"
               value={filters.categoryFilter}
               onChange={e => setFilters({...filters, categoryFilter: e.target.value})}
             >
               <option value="all">Semaforo: Todos</option>
               <option value="abandoned">🟡 Atención Urgente (7+ días)</option>
               <option value="interested">🟢 Alta Prioridad (Cierre/Cotiz.)</option>
               <option value="lost">🔴 Descartados (Perdido)</option>
             </select>
          </div>

          <button className="btn btn-secondary" onClick={() => setIsImportModalOpen(true)}>
            <Upload size={20} /> Carga Masiva
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={20} /> Exportar CSV
          </button>
        </div>
        <div className="right-actions">
           <div className="current-date-badge glass-panel">
              <span className="label">Hoy es:</span>
              <span className="value">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
           </div>
        </div>
      </div>
    </div>
  </div>

      <div className="native-table-container glass-panel">
        {loading && <div className="loading-overlay">Cargando...</div>}
        
        <table className="custom-spreadsheet">
          <thead>
            <tr className="main-header">
              <th style={{ width: '40px' }}>#</th>
              <th>
                <div className="th-content">
                  Vendedor
                  <button 
                    className={`filter-trigger ${filters.vendedor ? 'active' : ''}`}
                    onClick={() => setActiveFilterPopup(activeFilterPopup === 'vendedor' ? null : 'vendedor')}
                  >
                    <Filter size={14} />
                  </button>
                  {activeFilterPopup === 'vendedor' && (
                    <div className="filter-popup glass-panel animate-scale-in">
                      <Search size={14} className="popup-icon" />
                      <input 
                        type="text" 
                        placeholder="Buscar vendedor..." 
                        autoFocus
                        value={filters.vendedor} 
                        onChange={e => setFilters({...filters, vendedor: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              </th>
              <th>
                <div className="th-content">
                  Empresa
                  <button 
                    className={`filter-trigger ${filters.company_name ? 'active' : ''}`}
                    onClick={() => setActiveFilterPopup(activeFilterPopup === 'company_name' ? null : 'company_name')}
                  >
                    <Filter size={14} />
                  </button>
                  {activeFilterPopup === 'company_name' && (
                    <div className="filter-popup glass-panel animate-scale-in">
                      <Search size={14} className="popup-icon" />
                      <input 
                        type="text" 
                        placeholder="Buscar empresa..." 
                        autoFocus
                        value={filters.company_name} 
                        onChange={e => setFilters({...filters, company_name: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              </th>
              <th>
                <div className="th-content">
                  Giro
                  <button 
                    className={`filter-trigger ${filters.industry ? 'active' : ''}`}
                    onClick={() => setActiveFilterPopup(activeFilterPopup === 'industry' ? null : 'industry')}
                  >
                    <Filter size={14} />
                  </button>
                  {activeFilterPopup === 'industry' && (
                    <div className="filter-popup glass-panel animate-scale-in">
                      <input 
                        type="text" 
                        placeholder="Filtrar por giro..." 
                        autoFocus
                        value={filters.industry} 
                        onChange={e => setFilters({...filters, industry: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              </th>
              <th>
                <div className="th-content">
                  Contacto
                  <button 
                    className={`filter-trigger ${filters.contact_name ? 'active' : ''}`}
                    onClick={() => setActiveFilterPopup(activeFilterPopup === 'contact_name' ? null : 'contact_name')}
                  >
                    <Filter size={14} />
                  </button>
                  {activeFilterPopup === 'contact_name' && (
                    <div className="filter-popup glass-panel animate-scale-in">
                      <input 
                        type="text" 
                        placeholder="Nombre contacto..." 
                        autoFocus
                        value={filters.contact_name} 
                        onChange={e => setFilters({...filters, contact_name: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              </th>
              <th>
                <div className="th-content">
                  Email
                  <button 
                    className={`filter-trigger ${filters.email ? 'active' : ''}`}
                    onClick={() => setActiveFilterPopup(activeFilterPopup === 'email' ? null : 'email')}
                  >
                    <Filter size={14} />
                  </button>
                  {activeFilterPopup === 'email' && (
                    <div className="filter-popup glass-panel animate-scale-in">
                      <input 
                        type="text" 
                        placeholder="Filtrar email..." 
                        autoFocus
                        value={filters.email} 
                        onChange={e => setFilters({...filters, email: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              </th>
              <th>
                <div className="th-content">
                  Teléfono
                  <button 
                    className={`filter-trigger ${filters.phone ? 'active' : ''}`}
                    onClick={() => setActiveFilterPopup(activeFilterPopup === 'phone' ? null : 'phone')}
                  >
                    <Filter size={14} />
                  </button>
                  {activeFilterPopup === 'phone' && (
                    <div className="filter-popup glass-panel animate-scale-in">
                      <input 
                        type="text" 
                        placeholder="Filtrar teléfono..." 
                        autoFocus
                        value={filters.phone} 
                        onChange={e => setFilters({...filters, phone: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              </th>
              <th>
                <div className="th-content">
                  Estado
                  <button 
                    className={`filter-trigger ${filters.status ? 'active' : ''}`}
                    onClick={() => setActiveFilterPopup(activeFilterPopup === 'status' ? null : 'status')}
                  >
                    <Filter size={14} />
                  </button>
                  {activeFilterPopup === 'status' && (
                    <div className="filter-popup glass-panel animate-scale-in">
                      <select 
                        value={filters.status} 
                        autoFocus
                        onChange={e => setFilters({...filters, status: e.target.value})}
                        className="filter-select"
                      >
                        <option value="">Todos</option>
                        <option value="contacto inicial">Contacto Inicial</option>
                        <option value="seguimiento">Seguimiento</option>
                        <option value="cotización">Cotización</option>
                        <option value="cierre">Cierre</option>
                        <option value="perdido">Perdido</option>
                      </select>
                    </div>
                  )}
                </div>
              </th>
              <th>Fecha Inicio</th>
              <th>Fecha Actualizada</th>
              <th style={{ width: '50px' }}>Inactivos</th>
              <th>
                <div className="th-content">
                  Notas
                  <button 
                    className={`filter-trigger ${filters.notes ? 'active' : ''}`}
                    onClick={() => setActiveFilterPopup(activeFilterPopup === 'notes' ? null : 'notes')}
                  >
                    <Filter size={14} />
                  </button>
                  {activeFilterPopup === 'notes' && (
                    <div className="filter-popup glass-panel animate-scale-in">
                      <input 
                        type="text" 
                        placeholder="Buscar en notas..." 
                        autoFocus
                        value={filters.notes} 
                        onChange={e => setFilters({...filters, notes: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              </th>
              <th>
                <div className="th-content">
                  Seguimiento
                  <button 
                    className={`filter-trigger ${filters.follow_up ? 'active' : ''}`}
                    onClick={() => setActiveFilterPopup(activeFilterPopup === 'follow_up' ? null : 'follow_up')}
                  >
                    <Filter size={14} />
                  </button>
                  {activeFilterPopup === 'follow_up' && (
                    <div className="filter-popup glass-panel animate-scale-in">
                      <input 
                        type="text" 
                        placeholder="Buscar seguimiento..." 
                        autoFocus
                        value={filters.follow_up} 
                        onChange={e => setFilters({...filters, follow_up: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              </th>
              <th>Rec.</th>
              <th>
                <div className="th-content">
                  Nota Rec.
                  <button 
                    className={`filter-trigger ${filters.reminder_note ? 'active' : ''}`}
                    onClick={() => setActiveFilterPopup(activeFilterPopup === 'reminder_note' ? null : 'reminder_note')}
                  >
                    <Filter size={14} />
                  </button>
                  {activeFilterPopup === 'reminder_note' && (
                    <div className="filter-popup glass-panel animate-scale-in">
                      <input 
                        type="text" 
                        placeholder="Filtrar notas recordatorio..." 
                        autoFocus
                        value={filters.reminder_note} 
                        onChange={e => setFilters({...filters, reminder_note: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              </th>
              <th style={{ width: '40px' }}>Notif.</th>
              <th style={{ width: '50px' }}>Acc.</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((client, index) => (
              <tr key={client.id} className={getRowClass(client.status, client.last_contact_date)}>
                <td style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.75rem' }}>
                  {filteredRows.length - index}
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {client.profiles?.full_name || 'Sin asignar'}
                </td>
                <td>
                  <input 
                    type="text" 
                    value={client.company_name || ''} 
                    onChange={e => updateLocalState(client.id, 'company_name', e.target.value)}
                    onFocus={() => setInitialValue(client.company_name || '')}
                    onBlur={e => handleBlurSave(client.id, 'company_name', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    value={client.industry || ''} 
                    onChange={e => updateLocalState(client.id, 'industry', e.target.value)}
                    onFocus={() => setInitialValue(client.industry || '')}
                    onBlur={e => handleBlurSave(client.id, 'industry', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    value={client.contact_name || ''} 
                    onChange={e => updateLocalState(client.id, 'contact_name', e.target.value)}
                    onFocus={() => setInitialValue(client.contact_name || '')}
                    onBlur={e => handleBlurSave(client.id, 'contact_name', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    value={client.email || ''} 
                    onChange={e => updateLocalState(client.id, 'email', e.target.value)}
                    onFocus={() => setInitialValue(client.email || '')}
                    onBlur={e => handleBlurSave(client.id, 'email', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    value={client.phone || ''} 
                    onChange={e => updateLocalState(client.id, 'phone', e.target.value)}
                    onFocus={() => setInitialValue(client.phone || '')}
                    onBlur={e => handleBlurSave(client.id, 'phone', e.target.value)}
                  />
                </td>
                <td>
                  <select 
                    value={client.status || 'contacto inicial'}
                    onFocus={() => setInitialValue(client.status || 'contacto inicial')}
                    onChange={e => {
                      const newValue = e.target.value;
                      if (newValue === client.status) return;
                      updateLocalState(client.id, 'status', newValue);
                      handleBlurSave(client.id, 'status', newValue);
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
                    type="date" 
                    value={client.first_contact_date || ''} 
                    onChange={e => updateLocalState(client.id, 'first_contact_date', e.target.value)}
                    onFocus={() => setInitialValue(client.first_contact_date || '')}
                    onBlur={e => handleBlurSave(client.id, 'first_contact_date', e.target.value)}
                  />
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: '500' }}>
                  {client.last_contact_date 
                    ? new Date(client.last_contact_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) 
                    : '---'}
                </td>
                <td style={{ textAlign: 'center', opacity: 0.7, fontSize: '0.8rem', fontWeight: getDaysSinContacto(client.last_contact_date) >= 7 ? 'bold' : 'normal' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {getDaysSinContacto(client.last_contact_date) >= 7 && <AlertTriangle size={14} style={{ color: '#f59e0b' }} />}
                      {getDaysSinContacto(client.last_contact_date)}
                    </div>
                    {client.last_contact_date && (
                      <span style={{ fontSize: '0.65rem', opacity: 0.6, display: 'block' }}>
                        (Desde {new Date(client.last_contact_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })})
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <input 
                    type="text" 
                    value={client.notes || ''} 
                    onChange={e => updateLocalState(client.id, 'notes', e.target.value)}
                    onFocus={() => setInitialValue(client.notes || '')}
                    onBlur={e => handleBlurSave(client.id, 'notes', e.target.value)}
                    placeholder="Notas..."
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    value={client.follow_up || ''} 
                    onChange={e => updateLocalState(client.id, 'follow_up', e.target.value)}
                    onFocus={() => setInitialValue(client.follow_up || '')}
                    onBlur={e => handleBlurSave(client.id, 'follow_up', e.target.value)}
                    placeholder="Seguimiento..."
                  />
                </td>
                <td>
                  <input 
                    type="date" 
                    value={client.reminder_date || ''} 
                    onChange={e => updateLocalState(client.id, 'reminder_date', e.target.value)}
                    onFocus={() => setInitialValue(client.reminder_date || '')}
                    onBlur={e => handleBlurSave(client.id, 'reminder_date', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    value={client.reminder_note || ''} 
                    onChange={e => updateLocalState(client.id, 'reminder_note', e.target.value)}
                    onFocus={() => setInitialValue(client.reminder_note || '')}
                    onBlur={e => handleBlurSave(client.id, 'reminder_note', e.target.value)}
                    placeholder="Nota recordatorio..."
                  />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={client.reminder_active || false}
                    disabled={!client.reminder_date || !client.reminder_note}
                    onChange={e => {
                      const val = e.target.checked;
                      const currentVal = client.reminder_active === true;
                      if (val === currentVal) return;
                      
                      updateLocalState(client.id, 'reminder_active', val);
                      // Pasamos el valor actual directamente para saltar la validación del estado asíncrono
                      handleBlurSave(client.id, 'reminder_active', val, currentVal.toString());
                    }}
                    title={(!client.reminder_date || !client.reminder_note) ? "Define una fecha y nota primero" : "Notificación activa"}
                    style={{ width: '18px', height: '18px', cursor: (!client.reminder_date || !client.reminder_note) ? 'not-allowed' : 'pointer' }}
                  />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button 
                    className="delete-btn" 
                    onClick={() => handleDeleteClient(client.id, client.company_name)}
                    title="Borrar Cliente"
                  >
                    <Trash2 size={16} />
                  </button>
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
                <div className="form-group">
                  <label>Vendedor Asignado</label>
                  <input 
                    type="text" 
                    className="input premium-input" 
                    value={user?.name || ''} 
                    disabled 
                    style={{ opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.05)' }}
                  />
                </div>

                <div className="form-group">
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
                  <label>Fecha de Contacto</label>
                  <input 
                    type="date" 
                    className="input premium-input" 
                    value={newClientData.first_contact_date}
                    onChange={e => setNewClientData({...newClientData, first_contact_date: e.target.value})}
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
                  <label>Comentarios / Notas</label>
                  <input 
                    type="text" 
                    className="input premium-input" 
                    value={newClientData.notes}
                    onChange={e => setNewClientData({...newClientData, notes: e.target.value})}
                    placeholder="Notas principales..."
                  />
                </div>

                <div className="form-group full-width">
                  <label>Seguimiento Adicional</label>
                  <input 
                    type="text" 
                    className="input premium-input" 
                    value={newClientData.follow_up}
                    onChange={e => setNewClientData({...newClientData, follow_up: e.target.value})}
                    placeholder="Seguimiento extra..."
                  />
                </div>

                <div className="form-group">
                  <label>Fecha Recordatorio</label>
                  <input 
                    type="date" 
                    className="input premium-input" 
                    value={newClientData.reminder_date}
                    onChange={e => setNewClientData({...newClientData, reminder_date: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Nota Recordatorio</label>
                  <input 
                    type="text" 
                    className="input premium-input" 
                    value={newClientData.reminder_note}
                    onChange={e => setNewClientData({...newClientData, reminder_note: e.target.value})}
                    placeholder="Lo que hay que hacer..."
                  />
                </div>

                <div className="form-group full-width" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <label style={{ margin: 0 }}>¿Activar Recordatorio automático?</label>
                  <input 
                    type="checkbox" 
                    checked={newClientData.reminder_active}
                    disabled={!newClientData.reminder_date || !newClientData.reminder_note}
                    onChange={e => setNewClientData({...newClientData, reminder_active: e.target.checked})}
                    style={{ width: '20px', height: '20px' }}
                  />
                  {(!newClientData.reminder_date || !newClientData.reminder_note) && 
                    <span style={{ fontSize: '0.8rem', color: '#f87171' }}>Requieres fecha y nota</span>
                  }
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

      {isImportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-scale-in" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2><Upload size={24} className="icon-accent" /> Importar Clientes (CSV)</h2>
              <button className="close-btn" onClick={() => setIsImportModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="import-config" style={{ marginBottom: '2rem' }}>
              <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Sube tu archivo CSV. El sistema ignorará automáticamente las empresas que ya tengas registradas.
              </p>
              
              <label className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '1.5rem' }}>
                <input 
                  type="checkbox" 
                  checked={hasHeaders} 
                  onChange={e => setHasHeaders(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '0.95rem' }}>¿El archivo tiene títulos/encabezados?</span>
              </label>

              <div className="file-input-wrapper">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleImportCsv}
                  disabled={importLoading}
                  style={{ 
                    width: '100%', 
                    padding: '1rem', 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px dashed rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    color: 'white',
                    cursor: importLoading ? 'not-allowed' : 'pointer'
                  }}
                />
                {importLoading && <p style={{ marginTop: '10px', color: 'var(--accent)' }}>Procesando y validando duplicados...</p>}
              </div>
            </div>

            <div className="modal-actions" style={{ borderTop: 'none' }}>
              <button className="btn btn-outline" onClick={() => setIsImportModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
