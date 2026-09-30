import request from 'supertest';
import app from '../../src/app.js';

describe('Refresh token API (validaciones sin BD)', () => {
    test('POST /auth/refresh sin refreshToken regresa 400', async () => {
        const response = await request(app).post('/auth/refresh').send({});

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ message: 'refreshToken es obligatorio' });
    });

    test('POST /auth/logout sin refreshToken regresa 400', async () => {
        const response = await request(app).post('/auth/logout').send({});

        expect(response.statusCode).toBe(400);
    });
});
