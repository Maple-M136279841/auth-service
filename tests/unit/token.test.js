import jwt from 'jsonwebtoken';
import {
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    refreshTokenExpiresAt
} from '../../src/utils/token.js';

describe('Token Utils', () => {
    beforeAll(() => {
        process.env.JWT_SECRET = 'test-secret';
        process.env.JWT_EXPIRES_IN = '15m';
        process.env.REFRESH_TOKEN_EXPIRES_DAYS = '7';
    });

    test('genera un access token JWT con sub y email', () => {
        const token = generateAccessToken({ id: 5, email: 'a@b.com' });
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        expect(payload.sub).toBe(5);
        expect(payload.email).toBe('a@b.com');
        expect(payload.exp - payload.iat).toBe(15 * 60);
    });

    test('genera refresh tokens aleatorios y distintos', () => {
        const a = generateRefreshToken();
        const b = generateRefreshToken();

        expect(a).toHaveLength(128);
        expect(a).not.toBe(b);
    });

    test('el hash es determinista y distinto del token', () => {
        const token = generateRefreshToken();

        expect(hashToken(token)).toBe(hashToken(token));
        expect(hashToken(token)).not.toBe(token);
        expect(hashToken(token)).toHaveLength(64);
    });

    test('la expiración del refresh token es a 7 días', () => {
        const diff = refreshTokenExpiresAt().getTime() - Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        expect(Math.abs(diff - sevenDays)).toBeLessThan(1000);
    });
});
