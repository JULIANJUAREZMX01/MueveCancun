
import fs from 'node:fs';
import path from 'node:path';

// --- COORDINATE FINDER CLASS (Copied Logic) ---
const normalizeText = (text) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

class CoordinateFinder {
    constructor(db) {
        this.db = db;
        this.db = db;
        this.cache = new Map();
        this.keys = Object.keys(db);
        this.normalizedKeys = new Map(); // normalized -> original
        this.buildIndex();
    }

    buildIndex() {
        for (const key of this.keys) {
            const normalized = normalizeText(key);
            this.normalizedKeys.set(normalized, key);
        }
    }

    find(stopName) {
        if (!stopName) return null;
        const q = normalizeText(stopName);

        // 1. Exact match (High speed)
        if (this.db[stopName]) return this.db[stopName];

        // 2. Normalized Exact Match
        if (this.normalizedKeys.has(q)) {
            const originalKey = this.normalizedKeys.get(q);
            return this.db[originalKey];
        }

        // 3. Cache check
        if (this.cache.has(q)) return this.cache.get(q);

        return null;
    }

    findBestMatch(query) {
        // Fast exact find
        const coords = this.find(query);
        if (coords) {
             const name = Object.keys(this.db).find(k => this.db[k][0] === coords[0] && this.db[k][1] === coords[1]) || query;
             return { name, coords };
        }
        
        // Fallback to search if no exact match found
        const results = this.search(query, 1);
        return results.length > 0 ? results[0] : null;
    }

    search(query, limit = 5) {
        if (!query || query.length < 2) return [];
        const q = normalizeText(query);
        const candidates = new Set();
        const qTokens = q.split(/\s+/).filter(t => t.length > 0);

        // 1. Starts With (High ranking) and Contains (Medium ranking) Combined
        for (const key of this.keys) {
            const normKey = normalizeText(key);
            
            // Starts with query (Highest Priority)
            if (normKey.startsWith(q)) {
                candidates.add(key);
                continue;
            }
            
            // Contains query (High Priority)
            if (normKey.includes(q)) {
                 candidates.add(key);
                 continue;
            }
            
            // Token Match (Medium Priority - "Aeropuerto T2" finds "Terminal 2 Aeropuerto")
            // Check if ALL query tokens are present in the key
            if (qTokens.length > 1) {
                const allTokensMatch = qTokens.every(token => normKey.includes(token));
                if (allTokensMatch) {
                    candidates.add(key);
                }
            }
        }

        // Convert to array and sort by relevance
        return Array.from(candidates)
            .sort((a, b) => {
                const aNorm = normalizeText(a);
                const bNorm = normalizeText(b);
                
                // Exact match first
                if (aNorm === q) return -1;
                if (bNorm === q) return 1;

                // Starts with query second
                const aStarts = aNorm.startsWith(q);
                const bStarts = bNorm.startsWith(q);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;

                // Contains query as a distinct word (Stronger contain)
                const aWord = aNorm.includes(` ${q}`) || aNorm.includes(`${q} `);
                const bWord = bNorm.includes(` ${q}`) || bNorm.includes(`${q} `);
                if (aWord && !bWord) return -1;
                if (!aWord && bWord) return 1;

                // Length (shorter is usually better match)
                return a.length - b.length;
            })
            .slice(0, limit)
            .map(name => ({
                name,
                coords: this.db[name]
            }));
    }
}

// --- MAIN TEST Logic ---
async function runTests() {
  const dbPath = path.join(process.cwd(), 'public', 'coordinates.json');
  console.log(`Loading DB from: ${dbPath}`);
  
  const rawData = fs.readFileSync(dbPath, 'utf-8');
  const db = JSON.parse(rawData);
  const finder = new CoordinateFinder(db);
  
  console.log(` loaded ${Object.keys(db).length} stops.`);

  const testCases = [
    { query: 'cancun', expectedPart: 'Cancún' }, // Accent check
    { query: 'otoch', expectedPart: 'Otoch' },   // Substring check
    { query: 'plaza las americas', expectedPart: 'Plaza Las Américas' }, // Exact-ish check
    { query: 'aeropuerto t2', expectedPart: 'Aeropuerto' } // Token Match check
  ];

  let passed = 0;

  for (const t of testCases) {
    console.log(`\n🔍 Searching for: "${t.query}"`);
    const results = finder.search(t.query, 3);
    
    if (results.length > 0) {
      const top = results[0];
      console.log(`   ✅ Top Result: "${top.name}"`);
      if (top.name.toLowerCase().includes(t.expectedPart.toLowerCase())) {
        passed++;
      } else {
        console.error(`   ❌ FAIL: Expected "${t.expectedPart}" but got "${top.name}"`);
      }
    } else {
        console.error(`   ❌ FAIL: No results found.`);
    }
  }

  console.log(`\nTests Passed: ${passed}/${testCases.length}`);
  if (passed === testCases.length) {
      console.log("🎉 ALL TESTS PASSED. Logic is sound.");
      process.exit(0);
  } else {
      console.error("⚠️ SOME TESTS FAILED.");
      process.exit(1);
  }
}

runTests();
