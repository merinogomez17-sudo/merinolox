import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

async function run() {
  const envContent = fs.readFileSync('.env', 'utf-8');
  let url = '';
  let key = '';

  envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
  });

  const supabase = createClient(url, key);

  console.log("Intentando hacer fetch como en el frontend...");
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("ERROR en fetch:", error);
  } else {
    console.log(`Éxito. Se recuperaron ${data.length} registros.`);
    if (data.length > 0) {
      console.log("Muestra del primer registro:", data[0]);
    }
  }
}

run();
