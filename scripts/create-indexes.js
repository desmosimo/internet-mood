// Script Node.js per creare indici DB via Supabase client
// Alternativa a SQL manuale se preferisci eseguire da terminal

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carica .env.local dalla root
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variabili NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY mancanti in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const indexes = [
  {
    name: 'idx_moods_timestamp',
    sql: 'CREATE INDEX IF NOT EXISTS idx_moods_timestamp ON moods(timestamp DESC)',
    description: 'Indice su timestamp per range temporali'
  },
  {
    name: 'idx_moods_country',
    sql: 'CREATE INDEX IF NOT EXISTS idx_moods_country ON moods(country)',
    description: 'Indice su country per aggregazioni per paese'
  },
  {
    name: 'idx_moods_country_timestamp',
    sql: 'CREATE INDEX IF NOT EXISTS idx_moods_country_timestamp ON moods(country, timestamp DESC)',
    description: 'Indice composito (country, timestamp)'
  },
  {
    name: 'idx_moods_emoji',
    sql: 'CREATE INDEX IF NOT EXISTS idx_moods_emoji ON moods(emoji)',
    description: 'Indice su emoji per aggregazioni mood'
  },
  {
    name: 'idx_moods_timestamp_emoji',
    sql: 'CREATE INDEX IF NOT EXISTS idx_moods_timestamp_emoji ON moods(timestamp DESC, emoji)',
    description: 'Indice composito per trending analysis'
  },
  {
    name: 'idx_moods_reason',
    sql: 'CREATE INDEX IF NOT EXISTS idx_moods_reason ON moods(reason) WHERE reason IS NOT NULL',
    description: 'Indice parziale su reason (solo non-null)'
  }
];

async function createIndexes() {
  console.log('🔧 Creazione indici su tabella moods...\n');

  for (const idx of indexes) {
    console.log(`📌 Creando: ${idx.name}`);
    console.log(`   ${idx.description}`);
    
    try {
      // Nota: Supabase client JS non espone direttamente DDL.
      // Opzione 1: usare rpc() se hai una function PL/pgSQL
      // Opzione 2: usare Supabase REST API /rest/v1/rpc
      // Opzione 3: eseguire manualmente SQL via Dashboard
      
      // Per ora, stampiamo il comando che l'utente deve eseguire
      console.log(`   SQL: ${idx.sql}`);
      console.log('   ⚠️  Da eseguire manualmente nel SQL Editor di Supabase\n');
      
    } catch (err) {
      console.error(`   ❌ Errore: ${err.message}\n`);
    }
  }

  console.log('\n✅ Indici pronti. Esegui gli statement SQL nel Dashboard Supabase → SQL Editor.');
  console.log('   Oppure copia il contenuto di scripts/create-indexes.sql\n');
}

createIndexes();
