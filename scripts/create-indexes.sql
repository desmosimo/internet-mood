-- Indici per ottimizzare le query più frequenti su tabella moods
-- Esegui questi comandi nel SQL Editor di Supabase

-- 1. Indice su timestamp per filtrare per range temporale (day/week/month)
CREATE INDEX IF NOT EXISTS idx_moods_timestamp ON moods(timestamp DESC);

-- 2. Indice su country per aggregazioni per paese
CREATE INDEX IF NOT EXISTS idx_moods_country ON moods(country);

-- 3. Indice composito (country, timestamp) per query filtrate per paese e tempo
CREATE INDEX IF NOT EXISTS idx_moods_country_timestamp ON moods(country, timestamp DESC);

-- 4. Indice su emoji per aggregazioni mood
CREATE INDEX IF NOT EXISTS idx_moods_emoji ON moods(emoji);

-- 5. Indice composito (timestamp, emoji) per trending analysis
CREATE INDEX IF NOT EXISTS idx_moods_timestamp_emoji ON moods(timestamp DESC, emoji);

-- 6. Indice parziale su reason (solo righe con reason non null) per word cloud
CREATE INDEX IF NOT EXISTS idx_moods_reason ON moods(reason) WHERE reason IS NOT NULL;

-- Verifica indici creati
-- SELECT indexname, tablename, indexdef FROM pg_indexes WHERE tablename = 'moods';

-- NOTA: Gli indici accelerano le SELECT ma rallentano leggermente INSERT.
-- Con ~600 record l'impatto è minimo, diventa significativo sopra 100k+ righe.
