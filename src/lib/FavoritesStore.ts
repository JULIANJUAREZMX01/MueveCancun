// GraffitiWarrior Re-implementation
export class FavoritesStore {
  private static instance: FavoritesStore;
  private favorites: Set<string>;

  private constructor() {
    this.favorites = new Set();
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('graffiti_favorites');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
             this.favorites = new Set(parsed);
          }
        } catch (e) {
            console.error("Error loading favorites", e);
        }
      }
    }
  }

  public static getInstance(): FavoritesStore {
    if (!FavoritesStore.instance) {
      FavoritesStore.instance = new FavoritesStore();
    }
    return FavoritesStore.instance;
  }

  public isFavorite(id: string): boolean {
    return this.favorites.has(id);
  }

  public toggleFavorite(id: string, name: string): boolean {
    // name param kept for interface compatibility (e.g. analytics)
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
    } else {
      this.favorites.add(id);
    }
    this.save();
    return this.favorites.has(id);
  }

  private save() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('graffiti_favorites', JSON.stringify(Array.from(this.favorites)));
    }
  }
}

export const favoritesStore = FavoritesStore.getInstance();
