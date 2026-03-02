export interface FavoriteRoute {
    id: string;
    nombre: string;
    addedAt: number;
}

class FavoritesStore {
    private storageKey = "muevecancun_favorites";

    getFavorites(): FavoriteRoute[] {
        if (typeof window === 'undefined' || !window.localStorage) {
            return [];
        }

        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Failed to parse favorites from localStorage", e);
            return [];
        }
    }

    isFavorite(routeId: string): boolean {
        const favorites = this.getFavorites();
        return favorites.some(fav => fav.id === routeId);
    }

    addFavorite(routeId: string, routeName: string = "Ruta"): void {
        const favorites = this.getFavorites();
        if (!this.isFavorite(routeId)) {
            favorites.push({
                id: routeId,
                nombre: routeName,
                addedAt: Date.now()
            });
            this.saveFavorites(favorites);
        }
    }

    removeFavorite(routeId: string): void {
        let favorites = this.getFavorites();
        favorites = favorites.filter(fav => fav.id !== routeId);
        this.saveFavorites(favorites);
    }

    toggleFavorite(routeId: string, routeName: string = "Ruta"): boolean {
        if (this.isFavorite(routeId)) {
            this.removeFavorite(routeId);
            return false;
        } else {
            this.addFavorite(routeId, routeName);
            return true;
        }
    }

    private saveFavorites(favorites: FavoriteRoute[]): void {
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(favorites));
            } catch (e) {
                console.error("Failed to save favorites to localStorage", e);
            }
        }
    }
}

export const favoritesStore = new FavoritesStore();
