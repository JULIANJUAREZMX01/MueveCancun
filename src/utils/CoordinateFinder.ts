export interface StopMatch {
  name: string;
  coords: [number, number];
}

export class CoordinateFinder {
    // 🛡️ SECURITY FIX (Prototype Pollution Prevention)
    // We migrated this class to accept and manage a Map instead of a plain Object.
    // Plain objects are vulnerable to prototype pollution if an attacker can control
    // the keys (e.g. "__proto__"). Map methods like .get() and .has() are immune.
    private db: Map<string, [number, number]>;
    private cache: Map<string, [number, number]> = new Map();
    private tokenIndex: Map<string, string[]> = new Map();
    private keys: string[];
    private lowerKeys: string[];
    // Preserves original-cased stop names: lowercase key → original name
    private originalNames: Map<string, string>;

    constructor(db: Map<string, [number, number]>, originalNames?: Map<string, string>) {
        this.db = db;
        this.keys = Array.from(db.keys());
        this.lowerKeys = this.keys.map(k => k.toLowerCase());
        this.originalNames = originalNames ?? new Map();
        this.buildIndex();
    }

    private buildIndex() {
        for (let i = 0; i < this.lowerKeys.length; i++) {
            const lowerKey = this.lowerKeys[i];
            const originalKey = this.keys[i];
            // Tokenize: split by non-alphanumeric (including Spanish accents)
            const tokens = lowerKey.split(/[^a-z0-9\u00C0-\u017F]+/);
            for (const token of tokens) {
                if (token.length < 3) continue;
                if (!this.tokenIndex.has(token)) {
                    this.tokenIndex.set(token, []);
                }
                this.tokenIndex.get(token)!.push(originalKey);
            }
        }
    }

    public find(stopName: string): [number, number] | null {
        if (!stopName) return null;
        const q = stopName.trim();

        // 1. Exact match
        if (this.db.has(q)) return this.db.get(q)!;

        // 2. Cache check
        if (this.cache.has(q)) return this.cache.get(q)!;

        // 3. Fuzzy Search
        const searchTokens = q.toLowerCase().split(/[^a-z0-9\u00C0-\u017F]+/);
        const candidates = new Set<string>();

        for (const token of searchTokens) {
            if (token.length < 2) continue;
            const matches = this.tokenIndex.get(token);
            if (matches) {
                for (const m of matches) candidates.add(m);
            }
        }

        let bestKey: string | null = null;
        if (candidates.size > 0) {
             // Prefer candidates that are substrings or contain the query
             const lowerQ = q.toLowerCase();
             for (const k of candidates) {
                 const lowerK = k.toLowerCase();
                 if (lowerQ.includes(lowerK) || lowerK.includes(lowerQ)) {
                     bestKey = k;
                     break;
                 }
             }
             // Fallback to the first candidate if no substring match
             if (!bestKey) {
                 bestKey = candidates.values().next().value || null;
             }
        }

        const result = bestKey ? (this.db.get(bestKey) || null) : null;
        if (result) this.cache.set(q, result);
        return result;
    }

    public findBestMatch(query: string): StopMatch | null {
        const coords = this.find(query);
        if (coords) {
             // Find original key for coords
             let foundKey = query;
             for (const [k, v] of this.db.entries()) {
                 if (v[0] === coords[0] && v[1] === coords[1]) {
                     foundKey = k;
                     break;
                 }
             }
             const displayName = this.originalNames.get(foundKey) || foundKey;
             return { name: displayName, coords };
        }
        return null;
    }

    public search(query: string, limit: number = 5): StopMatch[] {
        if (!query || query.length < 2) return [];
        const q = query.toLowerCase().trim();
        const candidates = new Set<string>();

        // 1. Direct includes (high priority)
        for (let i = 0; i < this.lowerKeys.length; i++) {
            if (this.lowerKeys[i].includes(q)) {
                candidates.add(this.keys[i]);
            }
        }

        // 2. Token based (medium priority)
        const searchTokens = q.split(/[^a-z0-9\u00C0-\u017F]+/);
        for (const token of searchTokens) {
            if (token.length < 2) continue;
            const matches = this.tokenIndex.get(token);
            if (matches) {
                for (const m of matches) candidates.add(m);
            }
        }

        // Convert to array and sort by relevance
        return Array.from(candidates)
            .sort((a, b) => {
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();
                
                // Exact match first
                if (aLower === q) return -1;
                if (bLower === q) return 1;

                // Starts with query second
                if (aLower.startsWith(q) && !bLower.startsWith(q)) return -1;
                if (!aLower.startsWith(q) && bLower.startsWith(q)) return 1;

                // Length (shorter is usually better match)
                return a.length - b.length;
            })
            .slice(0, limit)
            .map(name => ({
                // Return original-cased name for display; key is lowercase
                name: this.originalNames.get(name) || name,
                coords: this.db.get(name)!
            }));
    }
}
