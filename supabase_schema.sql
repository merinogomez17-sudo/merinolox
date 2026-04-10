-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- 1. Tabla Perfiles (Roles)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT CHECK (role IN ('admin', 'vendedor')) NOT NULL DEFAULT 'vendedor',
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Perfiles visibles para todos los usuarios autenticados" ON profiles FOR
SELECT TO authenticated USING (true);
-- 2. Tabla Clientes
CREATE TABLE clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendedor_id UUID REFERENCES profiles(id) NOT NULL,
  company_name TEXT NOT NULL,
  industry TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT CHECK (
    status IN (
      'contacto inicial',
      'seguimiento',
      'cotización',
      'cierre',
      'perdido'
    )
  ) DEFAULT 'contacto inicial',
  first_contact_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  follow_up TEXT,
  last_contact_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- Política Clientes: Admins ven todos. Vendedores solo ven los suyos.
CREATE POLICY "Admins ver todo y vendedores solo lo suyo - SELECT" ON clients FOR
SELECT TO authenticated USING (
    vendedor_id = auth.uid()
    OR (
      SELECT role
      FROM profiles
      WHERE id = auth.uid()
    ) = 'admin'
  );
CREATE POLICY "Admins ver todo y vendedores solo lo suyo - INSERT" ON clients FOR
INSERT TO authenticated WITH CHECK (
    vendedor_id = auth.uid()
    OR (
      SELECT role
      FROM profiles
      WHERE id = auth.uid()
    ) = 'admin'
  );
CREATE POLICY "Admins ver todo y vendedores solo lo suyo - UPDATE" ON clients FOR
UPDATE TO authenticated USING (
    vendedor_id = auth.uid()
    OR (
      SELECT role
      FROM profiles
      WHERE id = auth.uid()
    ) = 'admin'
  );
-- 3. Tabla Actividades (Seguimiento)
CREATE TABLE activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  vendedor_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT CHECK (
    type IN ('Llamada', 'Email', 'WhatsApp', 'Visita')
  ) NOT NULL,
  activity_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  notes TEXT
);
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
-- Política Actividades: Admins ven todas. Vendedores solo las suyas.
CREATE POLICY "Admins ver todo y vendedores solo lo suyo - SELECT actividades" ON activities FOR
SELECT TO authenticated USING (
    vendedor_id = auth.uid()
    OR (
      SELECT role
      FROM profiles
      WHERE id = auth.uid()
    ) = 'admin'
  );
CREATE POLICY "Insertar actividades" ON activities FOR
INSERT TO authenticated WITH CHECK (
    vendedor_id = auth.uid()
    OR (
      SELECT role
      FROM profiles
      WHERE id = auth.uid()
    ) = 'admin'
  );
-- (Opcional) Trigger para crear perfil automáticamente cuando un usuario se registra
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$ BEGIN
INSERT INTO public.profiles (id, full_name, role)
VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'vendedor')
  );
RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();