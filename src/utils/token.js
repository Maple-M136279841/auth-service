import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

// Access token: JWT de vida corta que se envía en cada petición protegida
export function generateAccessToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
}

// Refresh token: cadena aleatoria opaca (no JWT) de vida larga
export function generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
}

// En la BD solo se guarda el hash; si alguien roba la tabla no obtiene tokens usables
export function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshTokenExpiresAt() {
    const days = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
