export class CoordinateFinder {
    private db: Record<string, [number, number]>;
    private cache: Map<string, [number, number] | null>;
    private tokenIndex: Map<string, string[]>;
    private keys: string[];

    constructor(db: Record<string, [number, number]>) {
        this.db = db;
        this.cache = new Map();
        this.tokenIndex = new Map();
        this.keys = Object.keys(db);
        this.buildIndex();
    }

    private buildIndex() {
        for (const key of this.keys) {
            // Tokenize: split by non-alphanumeric (including Spanish accents)
            const tokens = key.toLowerCase().split(/[^a-z0-9\u00C0-\u017F]+/);
            for (const token of tokens) {
                if (token.length < 3) continue;
                if (!this.tokenIndex.has(token)) {
                    this.tokenIndex.set(token, []);
                }
                this.tokenIndex.get(token)!.push(key);
            }
        }
    }

    public find(stopName: string): [number, number] | null {
        // 1. Exact match
        if (this.db[stopName]) return this.db[stopName];

        // 2. Cache check
        if (this.cache.has(stopName)) return this.cache.get(stopName)!;

        // 3. Fuzzy Search
        const searchTokens = stopName.toLowerCase().split(/[^a-z0-9\u00C0-\u017F]+/);
        const candidates = new Set<string>();

        for (const token of searchTokens) {
            if (token.length < 3) continue;
            const matches = this.tokenIndex.get(token);
            if (matches) {
                for (const m of matches) candidates.add(m);
            }
        }

        let bestKey: string | null = null;
        if (candidates.size > 0) {
             // Prefer candidates that are substrings or contain the query
             bestKey = Array.from(candidates).find(k => stopName.includes(k) || k.includes(stopName)) || null;
        }

        const result = bestKey ? this.db[bestKey] : null;
        this.cache.set(stopName, result);
        return result;
    }
}
