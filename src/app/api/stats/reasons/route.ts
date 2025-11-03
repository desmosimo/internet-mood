import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

type MoodRow = {
  reason?: string | null;
  country?: string | null;
};

// Stopwords comuni da escludere
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
  'could', 'can', 'may', 'might', 'must', 'i', 'me', 'my', 'mine', 'we',
  'our', 'ours', 'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her',
  'hers', 'it', 'its', 'they', 'them', 'their', 'theirs', 'this', 'that',
  'these', 'those', 'am', 'for', 'of', 'to', 'in', 'on', 'at', 'by', 'with',
  'from', 'as', 'but', 'or', 'and', 'because', 'so', 'very', 'too', 'much',
  'more', 'most', 'some', 'any', 'no', 'not', 'only', 'just', 'all', 'both',
  'each', 'every', 'few', 'many', 'such', 'who', 'what', 'where', 'when',
  'why', 'how', 'which', 'di', 'da', 'per', 'con', 'su', 'tra', 'fra',
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'e', 'o', 'ma',
  'se', 'come', 'anche', 'più', 'molto', 'poco', 'troppo', 'tanto', 'così'
]);

// Frasi comuni multi-parola da preservare (lowercase)
const COMMON_PHRASES = [
  'good weather', 'bad weather', 'nice day', 'long day', 'hard day',
  'great news', 'bad news', 'good news', 'family time', 'work stress',
  'feeling tired', 'feeling good', 'feeling bad', 'sunny day', 'rainy day',
  'stressful work', 'beautiful day', 'busy day', 'quiet day', 'productive day',
  'late night', 'early morning', 'quality time', 'me time', 'free time',
  'weekend plans', 'monday blues', 'friday feeling', 'tough day', 'amazing day'
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // Remove special chars
    .replace(/\s+/g, ' ')          // Collapse multiple spaces
    .trim();
}

function extractPhrases(text: string): string[] {
  const normalized = normalizeText(text);
  const results: string[] = [];
  
  // Step 1: Extract known multi-word phrases
  for (const phrase of COMMON_PHRASES) {
    if (normalized.includes(phrase)) {
      results.push(phrase);
    }
  }
  
  // Step 2: Extract single meaningful words (excluding stopwords)
  const words = normalized.split(' ').filter(w => w.length > 2 && !STOPWORDS.has(w));
  
  // Step 3: Detect potential 2-word phrases (adjective + noun pattern)
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i+1]}`;
    // Only add if not already covered by common phrases
    if (!COMMON_PHRASES.includes(bigram) && !results.includes(bigram)) {
      // Add bigrams that look meaningful (heuristic: both words > 3 chars)
      if (words[i].length > 3 && words[i+1].length > 3) {
        results.push(bigram);
      }
    }
  }
  
  // Step 4: Add remaining single words (if not part of captured phrases)
  for (const word of words) {
    const alreadyCovered = results.some(phrase => phrase.includes(word));
    if (!alreadyCovered) {
      results.push(word);
    }
  }
  
  return results;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('timeRange'); // 'day' | 'week' | 'month'
    const country = url.searchParams.get('country'); // Filter by country (optional)
    
    // Build query
    let query = supabase.from('moods').select('reason, country');
    
    // Apply time filter
    if (timeRange === 'day') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte('timestamp', today.toISOString());
    } else if (timeRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      weekAgo.setHours(0, 0, 0, 0);
      query = query.gte('timestamp', weekAgo.toISOString());
    } else if (timeRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 29);
      monthAgo.setHours(0, 0, 0, 0);
      query = query.gte('timestamp', monthAgo.toISOString());
    }
    
    // Apply country filter
    if (country) {
      query = query.eq('country', country.toUpperCase());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[REASONS] Supabase error:', error);
      return NextResponse.json({ 
        global: [], 
        byCountry: {},
        error: error.message 
      });
    }
    
    const rows = (data || []) as MoodRow[];
    
    // Aggregate phrases globally and by country
    const globalPhrases: Record<string, number> = {};
    const byCountryPhrases: Record<string, Record<string, number>> = {};
    
    for (const row of rows) {
      if (!row.reason || row.reason.trim().length < 2) continue;
      
      const phrases = extractPhrases(row.reason);
      const countryCode = row.country?.toUpperCase() || 'Unknown';
      
      // Global aggregation
      for (const phrase of phrases) {
        globalPhrases[phrase] = (globalPhrases[phrase] || 0) + 1;
      }
      
      // By-country aggregation
      if (!byCountryPhrases[countryCode]) {
        byCountryPhrases[countryCode] = {};
      }
      for (const phrase of phrases) {
        byCountryPhrases[countryCode][phrase] = (byCountryPhrases[countryCode][phrase] || 0) + 1;
      }
    }
    
    // Sort and limit
    const topGlobal = Object.entries(globalPhrases)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([phrase, count]) => ({ phrase, count }));
    
    const topByCountry: Record<string, Array<{ phrase: string; count: number }>> = {};
    for (const [code, phrases] of Object.entries(byCountryPhrases)) {
      topByCountry[code] = Object.entries(phrases)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([phrase, count]) => ({ phrase, count }));
    }
    
    return NextResponse.json({
      global: topGlobal,
      byCountry: topByCountry,
      total: rows.length,
      timeRange: timeRange || 'all'
    });
    
  } catch (err) {
    console.error('[REASONS] Error:', err);
    return NextResponse.json({ 
      global: [], 
      byCountry: {},
      error: String(err) 
    }, { status: 500 });
  }
}
