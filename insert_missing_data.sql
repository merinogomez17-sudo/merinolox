-- Script para insertar datos con soporte para orden de seguimiento (last_contact_date)
-- Reemplaza 'YOUR_VENDEDOR_ID_HERE' con el UUID de tu usuario

INSERT INTO clients (vendedor_id, company_name, industry, contact_name, email, phone, status, first_contact_date, last_contact_date, notes, follow_up)
VALUES 
-- Clientes con contacto antiguo (deben aparecer Arriba)
('YOUR_VENDEDOR_ID_HERE', 'Cristlizz', 'Empaques', '', 'compras@cristlizz.com', '55 5594 2338', 'seguimiento', '2025-10-15', '2025-11-25', 'Se envió carta de presentación 15 oct', 'Seguimiento 27 de oct. Correo de seguimiento 25 de nov.'),
('YOUR_VENDEDOR_ID_HERE', 'Corona Atizapan', 'Bebidas', 'F. Hernandez', 'fhernandez@coronaatizapan.mx', '5558242700 ext 114', 'seguimiento', '2025-12-03', '2026-02-05', 'Se envió Carta de presentación', 'Seguimiento 14 de enero. correo de seguimiento 05 de feb.'),

-- Cliente con contacto reciente (debe aparecer Abajo)
('YOUR_VENDEDOR_ID_HERE', 'NWI', 'Organismo', '', 'compras@nwi.org.mx', '55 1668 6078', 'cotización', '2026-03-04', '2026-04-09', 'Se entregó carta de presentación física', 'Llamada 09 de marzo y me contestaron. Enviarán productos para cotizar etiqueta y ribbons. seguimiento correo 18 de marzo.'),

-- Otros contactos
('YOUR_VENDEDOR_ID_HERE', 'Jermex', '', '', 'comprascdmx@jermex.com', '5555277290', 'seguimiento', '2026-02-19', '2026-03-23', 'Se envió Carta de presentación', 'seguimiento 2 de marzo. correo de seguimiento 23 de mar.'),
('YOUR_VENDEDOR_ID_HERE', 'Assatex', 'Textil', 'U. Camargo', 'ucamargo@assatex.com', '1028', 'seguimiento', '2026-03-03', '2026-03-03', 'Se envió Carta de presentación', ''),
('YOUR_VENDEDOR_ID_HERE', 'La Paloma', 'Distribución', '', 'uditorianaucalpan@lapaloma.com.mx', '800 849 5444', 'contacto inicial', '2025-10-16', '2025-10-16', '', '');
