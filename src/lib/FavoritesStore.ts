
export class FavoritesStore {
    private favorites: Set<string>;
    private key = 'muevecancun_favorites';

    constructor() {
        this.favorites = new Set();
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                const stored = localStorage.getItem(this.key);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        parsed.forEach((id: string) => this.favorites.add(id));
                    }
                }
            } catch (e) {
                console.warn("Failed to load favorites", e);
            }
        }
    }

    isFavorite(id: string): boolean {
        return this.favorites.has(id);
    }

    toggleFavorite(id: string, name?: string): boolean {
        const isFav = this.favorites.has(id);
        if (isFav) {
            this.favorites.delete(id);
        } else {
            this.favorites.add(id);
        }
        this.save();
        return !isFav;
    }

    private save() {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(this.key, JSON.stringify(Array.from(this.favorites)));
        }
    }
}

export const favoritesStore = new FavoritesStore();
