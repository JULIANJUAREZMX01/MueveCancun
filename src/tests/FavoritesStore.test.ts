// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { favoritesStore } from '../utils/FavoritesStore';

describe('FavoritesStore', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should return empty array when no favorites exist', () => {
        const favorites = favoritesStore.getFavorites();
        expect(favorites).toEqual([]);
    });

    it('should add a favorite correctly', () => {
        favoritesStore.addFavorite('ruta-1', 'Ruta 1');

        const favorites = favoritesStore.getFavorites();
        expect(favorites).toHaveLength(1);
        expect(favorites[0].id).toBe('ruta-1');
        expect(favorites[0].nombre).toBe('Ruta 1');
        expect(favorites[0].addedAt).toBeTypeOf('number');
    });

    it('should not add a duplicate favorite', () => {
        favoritesStore.addFavorite('ruta-1', 'Ruta 1');
        favoritesStore.addFavorite('ruta-1', 'Ruta 1 Duplicada'); // Should be ignored

        const favorites = favoritesStore.getFavorites();
        expect(favorites).toHaveLength(1);
        expect(favorites[0].nombre).toBe('Ruta 1');
    });

    it('should remove a favorite correctly', () => {
        favoritesStore.addFavorite('ruta-1', 'Ruta 1');
        favoritesStore.addFavorite('ruta-2', 'Ruta 2');

        favoritesStore.removeFavorite('ruta-1');

        const favorites = favoritesStore.getFavorites();
        expect(favorites).toHaveLength(1);
        expect(favorites[0].id).toBe('ruta-2');
    });

    it('should check if a route is favorite', () => {
        expect(favoritesStore.isFavorite('ruta-1')).toBe(false);

        favoritesStore.addFavorite('ruta-1', 'Ruta 1');
        expect(favoritesStore.isFavorite('ruta-1')).toBe(true);
    });

    it('should toggle a favorite correctly', () => {
        // Initially not a favorite, should add it and return true
        const added = favoritesStore.toggleFavorite('ruta-1', 'Ruta 1');
        expect(added).toBe(true);
        expect(favoritesStore.isFavorite('ruta-1')).toBe(true);

        // Already a favorite, should remove it and return false
        const addedAgain = favoritesStore.toggleFavorite('ruta-1', 'Ruta 1');
        expect(addedAgain).toBe(false);
        expect(favoritesStore.isFavorite('ruta-1')).toBe(false);
    });

    it('should handle corrupted data in localStorage gracefully', () => {
        // Manually inject invalid JSON
        localStorage.setItem('muevecancun_favorites', '{ invalid json ]');

        // Should not throw, but instead return an empty array
        const favorites = favoritesStore.getFavorites();
        expect(favorites).toEqual([]);
    });
});
