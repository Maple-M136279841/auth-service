import pool from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    refreshTokenExpiresAt
} from '../utils/token.js';

export async function register({ email, password, name }) {
    const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
    );

    if (existing.rowCount > 0) {
        throw new Error('USER_ALREADY_EXISTS');
    }

    const passwordHash = await hashPassword(password);

    const result = await pool.query(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING id, email, name, created_at`,
        [email, passwordHash, name ?? null]
    );

    return result.rows[0];
}

// Crea un refresh token, guarda su hash y regresa el token en claro (solo esta vez)
async function issueRefreshToken(db, userId) {
    const refreshToken = generateRefreshToken();

    await db.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, hashToken(refreshToken), refreshTokenExpiresAt()]
    );

    return refreshToken;
}

export async function login({ email, password }) {
    const result = await pool.query(
        `SELECT id, email, password_hash
         FROM users
         WHERE email = $1`,
        [email]
    );

    if (result.rowCount === 0) {
        throw new Error('INVALID_CREDENTIALS');
    }

    const user = result.rows[0];
    const valid = await comparePassword(password, user.password_hash);

    if (!valid) {
        throw new Error('INVALID_CREDENTIALS');
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await issueRefreshToken(pool, user.id);

    return { accessToken, refreshToken, tokenType: 'Bearer' };
}

// Rotación: cada refresh token se usa UNA sola vez y se cambia por uno nuevo
export async function refresh({ refreshToken }) {
    const tokenHash = hashToken(refreshToken);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, rt.replaced_by_hash, u.email
             FROM refresh_tokens rt
             JOIN users u ON u.id = rt.user_id
             WHERE rt.token_hash = $1
             FOR UPDATE`,
            [tokenHash]
        );

        if (result.rowCount === 0) {
            throw new Error('INVALID_REFRESH_TOKEN');
        }

        const stored = result.rows[0];

        // Detección de reutilización: un token que YA fue rotado se volvió a usar.
        // Posible robo -> se revocan todas las sesiones del usuario.
        if (stored.revoked_at && stored.replaced_by_hash) {
            await client.query(
                `UPDATE refresh_tokens
                 SET revoked_at = NOW()
                 WHERE user_id = $1 AND revoked_at IS NULL`,
                [stored.user_id]
            );
            await client.query('COMMIT');
            throw new Error('REFRESH_TOKEN_REUSED');
        }

        // Revocado por logout o por cierre de sesiones
        if (stored.revoked_at) {
            throw new Error('INVALID_REFRESH_TOKEN');
        }

        if (new Date(stored.expires_at) <= new Date()) {
            throw new Error('REFRESH_TOKEN_EXPIRED');
        }

        const user = { id: stored.user_id, email: stored.email };
        const newRefreshToken = await issueRefreshToken(client, user.id);

        await client.query(
            `UPDATE refresh_tokens
             SET revoked_at = NOW(), replaced_by_hash = $2
             WHERE id = $1`,
            [stored.id, hashToken(newRefreshToken)]
        );

        await client.query('COMMIT');

        return {
            accessToken: generateAccessToken(user),
            refreshToken: newRefreshToken,
            tokenType: 'Bearer'
        };
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}

export async function logout({ refreshToken }) {
    await pool.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE token_hash = $1 AND revoked_at IS NULL`,
        [hashToken(refreshToken)]
    );
}
