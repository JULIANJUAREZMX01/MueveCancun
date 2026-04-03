import { bench, describe } from 'vitest';
import { CoordinateFinder } from '../../utils/CoordinateFinder';

function generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

const db: Map<string, [number, number]> = new Map();
for (let i = 0; i < 10000; i++) {
    const key = generateRandomString(10 + Math.floor(Math.random() * 10)); // Random string length 10-20
    db.set(key, [Math.random() * 100, Math.random() * 100]);
}

// Add some known keys for searching
db.set('Plaza Las Americas', [21.145, -86.825]);
db.set('Mercado 28', [21.160, -86.828]);
db.set('Zona Hotelera', [21.135, -86.750]);

const finder = new CoordinateFinder(db);

describe('CoordinateFinder Performance', () => {
    bench('search "Plaza"', () => {
        finder.search('Plaza');
    });

    bench('search "Mercado"', () => {
        finder.search('Mercado');
    });

    bench('search "random"', () => {
        finder.search('xy7z');
    });
});
