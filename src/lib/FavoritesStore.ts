export interface FavoriteRoute {
  id: string;
  name: string;
  timestamp: number;
}

class FavoritesStore {
  private static instance: FavoritesStore;
  private STORAGE_KEY = 'muevecancun_favorites';
  private favorites: FavoriteRoute[] = [];

  private constructor() {
    this.load();
  }

  public static getInstance(): FavoritesStore {
    if (typeof window === 'undefined') {
        // Return a dummy instance for SSR that won't persist or share state
        return new FavoritesStore();
    }
    if (!FavoritesStore.instance) {
      FavoritesStore.instance = new FavoritesStore();
    }
    return FavoritesStore.instance;
  }

  private load() {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.favorites = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load favorites', e);
    }
  }

  private save() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.favorites));
    } catch (e) {
      console.warn('Failed to save favorites', e);
    }
  }

  public getFavorites(): FavoriteRoute[] {
    return this.favorites;
  }

  public isFavorite(id: string): boolean {
    return this.favorites.some(f => f.id === id);
  }

  public toggleFavorite(id: string, name: string): boolean {
    const index = this.favorites.findIndex(f => f.id === id);
    let added = false;
    if (index >= 0) {
      this.favorites.splice(index, 1);
      added = false;
    } else {
      this.favorites.push({ id, name, timestamp: Date.now() });
      added = true;
    }
    this.save();
    return added;
  }
}

export const favoritesStore = FavoritesStore.getInstance();
