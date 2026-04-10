import pg from 'pg';
const client = new pg.Client({connectionString: process.env.DB_CONNECTION_STRING});
await client.connect();
try {
  await client.query(`
    CREATE POLICY "Admins ver todo y vendedores solo lo suyo - DELETE" 
    ON clients FOR DELETE TO authenticated 
    USING (
      vendedor_id = auth.uid() OR 
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );
  `);
  console.log('Policy added.');
} catch (e) {
  console.error('Error or already exists:', e.message);
} finally {
  await client.end();
}
