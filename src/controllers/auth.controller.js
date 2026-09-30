import * as authService from '../services/auth.service.js';

export async function register(req, res) {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email y password son obligatorios'
            });
        }

        const user = await authService.register({ email, password, name });

        return res.status(201).json({
            message: 'Usuario registrado correctamente',
            user
        });
    } catch (error) {
        if (error.message === 'USER_ALREADY_EXISTS') {
            return res.status(409).json({ message: 'El usuario ya existe' });
        }

        console.error(error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email y password son obligatorios'
            });
        }

        const result = await authService.login({ email, password });
        return res.status(200).json(result);
    } catch (error) {
        if (error.message === 'INVALID_CREDENTIALS') {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        console.error(error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}

export async function me(req, res) {
    return res.status(200).json({ user: req.user });
}

const REFRESH_ERRORS = {
    INVALID_REFRESH_TOKEN: 'Refresh token inválido',
    REFRESH_TOKEN_EXPIRED: 'Refresh token expirado',
    REFRESH_TOKEN_REUSED: 'Refresh token reutilizado; se cerraron todas las sesiones'
};

export async function refresh(req, res) {
    try {
        const { refreshToken } = req.body ?? {};

        if (!refreshToken) {
            return res.status(400).json({ message: 'refreshToken es obligatorio' });
        }

        const result = await authService.refresh({ refreshToken });
        return res.status(200).json(result);
    } catch (error) {
        if (REFRESH_ERRORS[error.message]) {
            return res.status(401).json({ message: REFRESH_ERRORS[error.message] });
        }

        console.error(error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}

export async function logout(req, res) {
    try {
        const { refreshToken } = req.body ?? {};

        if (!refreshToken) {
            return res.status(400).json({ message: 'refreshToken es obligatorio' });
        }

        await authService.logout({ refreshToken });
        return res.status(204).send();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}
