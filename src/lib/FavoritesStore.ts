/**
 * MueveCancun Favorites Store
 * Manages user's favorite routes using localStorage.
 */

export interface FavoriteRoute {
    id: string;
    nombre: string;
    addedAt: number;
}

class FavoritesStore {
    private storageKey = 'muevecancun_favorites';

    getFavorites(): FavoriteRoute[] {
        if (typeof window === 'undefined') return [];
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error("Failed to load favorites", e);
            return [];
        }
    }

    isFavorite(id: string): boolean {
        return this.getFavorites().some(f => f.id === id);
    }

    toggleFavorite(id: string, nombre: string): boolean {
        let favorites = this.getFavorites();
        const index = favorites.findIndex(f => f.id === id);
        let added = false;

        if (index > -1) {
            favorites.splice(index, 1);
        } else {
            favorites.push({ id, nombre, addedAt: Date.now() });
            added = true;
        }

        localStorage.setItem(this.storageKey, JSON.stringify(favorites));
        
        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('FAVORITES_UPDATED', { 
            detail: { id, added, favorites } 
        }));

        return added;
    }
}

export const favoritesStore = new FavoritesStore();
