# Rate Limiting - Sistema Anti-Spam

## 🎯 Strategia Implementata

Sistema **IP + Device ID** con limite giornaliero per permettere a più dispositivi sulla stessa rete di votare.

## 📊 Configurazione Attuale

- **Limite**: 5 submit per giorno per combinazione IP + Device
- **Reset**: Automatico a mezzanotte (nuovo giorno)
- **Chiave**: `${IP}:${deviceId}` (es. `192.168.1.1:a3b2c1d4-...`)

## 🔧 Come Funziona

### Client-Side (page.tsx)

1. **Device ID Generation** (prima visita):
```typescript
// Genera UUID v4 e salva in localStorage 'im_device_id'
getDeviceId() -> 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
```

2. **Submit Mood**:
```typescript
payload = {
  emoji, label, timestamp, country, ...
  deviceId: getDeviceId() // Include device_id nella richiesta
}
```

### Server-Side (api/mood/route.ts)

1. **Estrazione dati**:
   - IP: da headers `x-forwarded-for` o `x-real-ip`
   - Device ID: da payload body

2. **Rate Limit Check**:
```typescript
rateLimitKey = `${ip}:${deviceId}`
rateLimitMap.get(rateLimitKey)
```

3. **Response**:
   - ✅ **<5 submit oggi**: Accettato, counter++
   - ❌ **≥5 submit oggi**: HTTP 429 + headers:
     - `Retry-After: 86400` (24 ore)
     - `X-RateLimit-Limit: 5`
     - `X-RateLimit-Remaining: 0`

## 🏢 Casi d'Uso Risolti

### ✅ Rete Aziendale (stesso IP, multi-device)
- 👤 Dipendente A (PC desktop) → Device ID: abc-123
- 👤 Dipendente B (PC desktop) → Device ID: def-456
- 👤 Dipendente C (laptop) → Device ID: ghi-789
- **Risultato**: Tutti possono votare (device ID diversi)

### ✅ Famiglia (stesso IP, multi-device)
- 👨 Padre (smartphone) → Device ID: aaa-111
- 👩 Madre (tablet) → Device ID: bbb-222
- 👧 Figlia (laptop) → Device ID: ccc-333
- **Risultato**: Tutti possono votare indipendentemente

### ❌ Spam (stesso device, tentativi multipli)
- 🤖 Bot/Utente malintenzionato → Stesso IP + Stesso Device ID
- **Risultato**: Bloccato dopo 5 submit

## ⚠️ Limitazioni In-Memory

### Problema
Il sistema attuale usa `Map<string, DailyRecord>` in memoria, che **non persiste** in ambiente serverless (Vercel).

### Impatto
- ✅ **Dev locale**: Funziona perfettamente
- ⚠️ **Vercel produzione**: Ogni invocazione serverless ha memoria separata
  - Rate limit **non condiviso** tra invocazioni
  - Utente potrebbe aggirare limite con molte richieste simultanee

### Soluzione per Produzione

Migrare a storage persistente:

#### Opzione 1: Upstash Redis (Consigliata)
```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 d'),
  prefix: 'im_ratelimit',
});

const { success, limit, remaining } = await ratelimit.limit(`${ip}:${deviceId}`);
if (!success) return NextResponse.json(..., { status: 429 });
```

**Pro**: Serverless-native, free tier 10k richieste/giorno, latenza <10ms  
**Contro**: Richiede account Upstash

#### Opzione 2: Tabella Supabase
Creare tabella `rate_limits`:
```sql
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,           -- IP:deviceId
  date TEXT NOT NULL,              -- YYYY-MM-DD
  count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_rate_limits_date ON rate_limits(date);
```

```typescript
const { data } = await supabase
  .from('rate_limits')
  .select('count')
  .eq('key', `${ip}:${deviceId}`)
  .eq('date', todayKey())
  .single();

if (data && data.count >= 5) return NextResponse.json(..., { status: 429 });
```

**Pro**: Usa infrastruttura esistente, nessun servizio extra  
**Contro**: Query aggiuntiva per ogni submit (+20-50ms latenza)

## 🛡️ Sicurezza

### Device ID può essere falsificato?
**Sì**, ma:
1. Richiede conoscenza tecnica (manipolare localStorage)
2. Ogni device_id falso è comunque limitato a 5 submit/giorno
3. IP rimane tracciato (limite implicito ~50 submit/IP/giorno se 10 dispositivi falsi)

### Protezioni aggiuntive
- ✅ Limite per IP (anche senza device_id)
- ✅ Payload sanitization (reason max 30 char)
- 🔄 TODO: Honeypot field (campo nascosto anti-bot)
- 🔄 TODO: CAPTCHA per submission anomale (opzionale)

## 📈 Monitoraggio

Per analizzare pattern di utilizzo:

```typescript
// Log rate limit hits (aggiungi in route.ts)
if (current.count >= DAILY_LIMIT) {
  console.log(`[RATE_LIMIT] ${rateLimitKey} blocked at ${new Date().toISOString()}`);
  // In prod: invia a analytics (Vercel Analytics, Sentry, etc.)
}
```

## 🔧 Configurazione

Per modificare il limite giornaliero:

```typescript
// src/app/api/mood/route.ts
const DAILY_LIMIT = 5; // <-- Cambia qui (es. 3, 10, 20)
```

Valori consigliati:
- **Stretto**: 3 (anti-spam aggressivo, rischio bloccare utenti legittimi)
- **Bilanciato**: 5 (attuale, copre multi-device senza permettere spam)
- **Permissivo**: 10-20 (per testing o eventi con molti partecipanti)

## 🧪 Testing

### Test 1: Submit normale
1. Apri http://localhost:3001
2. Seleziona mood e invia
3. Verifica console browser: `localStorage.getItem('im_device_id')` deve esistere
4. Verifica response 200 OK

### Test 2: Rate limit (stesso device)
1. Ripeti submit 5 volte dallo stesso browser
2. Al 6° tentativo: dovrebbe ricevere HTTP 429
3. Messaggio: "Daily limit reached: 5 mood per giorno per dispositivo"

### Test 3: Multi-device (simulato)
1. Invia 5 mood da browser normale
2. Apri finestra incognito (nuovo device_id)
3. Invia altri 5 mood → Dovrebbe funzionare
4. 6° submit in incognito → HTTP 429

### Test 4: Reset giornaliero
1. Cambia manualmente data sistema a domani
2. Ricarica pagina
3. Submit dovrebbe funzionare (counter reset)

## 📚 References

- [RFC 6585 - HTTP 429 Too Many Requests](https://tools.ietf.org/html/rfc6585#section-4)
- [Upstash Rate Limiting](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- [Device Fingerprinting Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API)
