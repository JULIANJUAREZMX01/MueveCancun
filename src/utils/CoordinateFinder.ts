export interface StopMatch {
  name: string;
  coords: [number, number];
}

export class CoordinateFinder {
    // 🛡️ SECURITY FIX (Prototype Pollution Prevention)
    private db: Map<string, [number, number]>;
    private cache: Map<string, [number, number]> = new Map();
    private tokenIndex: Map<string, string[]> = new Map();
    private keys: string[];
    private lowerKeys: string[];
    private originalNames: Map<string, string>;

    constructor(db: Map<string, [number, number]>, originalNames?: Map<string, string>) {
        this.db = db;
        this.keys = Array.from(db.keys());
        this.lowerKeys = this.keys.map(k => k.toLowerCase());
        this.originalNames = originalNames ?? new Map();
        this.buildIndex();
    }

    private buildIndex() {
        for (const key of this.keys) {
            const tokens = key.toLowerCase().split(/[^a-z0-9\u00C0-\u017F]+/);
            for (const token of tokens) {
                if (token.length < 2) continue;
                if (!this.tokenIndex.has(token)) {
                    this.tokenIndex.set(token, []);
                }
                this.tokenIndex.get(token)!.push(key);
            }
        }
    }

    public find(stopName: string): [number, number] | null {
        if (!stopName) return null;
        const q = stopName.trim();
        if (this.db.has(q)) return this.db.get(q)!;
        if (this.cache.has(q)) return this.cache.get(q)!;

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
             const lowerQ = q.toLowerCase();
             bestKey = Array.from(candidates).find(k => {
                 const lowerK = k.toLowerCase();
                 return lowerQ.includes(lowerK) || lowerK.includes(lowerQ);
             }) || Array.from(candidates)[0];
        }

        const result = bestKey ? (this.db.get(bestKey) || null) : null;
        if (result) this.cache.set(q, result);
        return result;
    }

    public findBestMatch(query: string): StopMatch | null {
        const coords = this.find(query);
        if (coords) {
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

        for (let i = 0; i < this.lowerKeys.length; i++) {
            if (this.lowerKeys[i].includes(q)) {
                candidates.add(this.keys[i]);
            }
        }

        const searchTokens = q.split(/[^a-z0-9\u00C0-\u017F]+/);
        for (const token of searchTokens) {
            if (token.length < 2) continue;
            const matches = this.tokenIndex.get(token);
            if (matches) {
                for (const m of matches) candidates.add(m);
            }
        }

        return Array.from(candidates)
            .sort((a, b) => {
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();
                if (aLower === q) return -1;
                if (bLower === q) return 1;
                if (aLower.startsWith(q) && !bLower.startsWith(q)) return -1;
                if (!aLower.startsWith(q) && bLower.startsWith(q)) return 1;
                return a.length - b.length;
            })
            .slice(0, limit)
            .map(name => ({
                name: this.originalNames.get(name) || name,
                coords: this.db.get(name)!
            }));
    }
}
