export type Role = 'admin' | 'vendedor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type ClientStatus = 'contacto inicial' | 'seguimiento' | 'cotización' | 'cierre' | 'perdido';

export interface Client {
  id: string;
  vendedorId: string;
  companyName: string;
  industry: string;
  contactName: string;
  email: string;
  phone: string;
  status: ClientStatus;
  firstContactDate: string;
  notes: string;
  daysElapsed?: number; // Calculated dynamically usually, but keeping it in interface for grid
}

export type ActivityType = 'Llamada' | 'Email' | 'WhatsApp' | 'Visita';

export interface Activity {
  id: string;
  clientId: string;
  vendedorId: string;
  type: ActivityType;
  date: string;
  notes: string;
}
