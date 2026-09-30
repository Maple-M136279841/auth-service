# Auth Service

Microservicio didáctico de autenticación construido con:

- Node.js + Express
- ES Modules (`import` / `export`)
- PostgreSQL usando `pg`
- bcrypt
- JWT
- Jest + Supertest

## 1. Instalar

```bash
npm install
```

Copiar `.env.example` a `.env` y llenar los valores.

Crear las tablas (incluye `refresh_tokens`):

```bash
psql -h localhost -U <usuario> -d <base> -f sql/init.sql
```

## 2. Ejecutar

```bash
npm run dev
```

Probar:

`GET http://localhost:3000/health`

## 3. Endpoints

### Registro
`POST /auth/register`

```json
{
  "name": "usuario",
  "email": "usuario@dominio.com",
  "password": "********"
}
```

### Login
`POST /auth/login`

```json
{
  "email": "usuario@dominio.com",
  "password": "********"
}
```

Respuesta:

```json
{
  "accessToken": "<JWT de 15 min>",
  "refreshToken": "<token opaco de 7 días>",
  "tokenType": "Bearer"
}
```

### Renovar tokens (Refresh Token con rotación)
`POST /auth/refresh`

```json
{ "refreshToken": "<refreshToken>" }
```

Regresa un **nuevo** `accessToken` y un **nuevo** `refreshToken`. El anterior queda revocado.
Si un refresh token ya rotado se vuelve a usar, se considera robo y se revocan todas las sesiones del usuario (401).

### Cerrar sesión
`POST /auth/logout`

```json
{ "refreshToken": "<refreshToken>" }
```

Responde `204 No Content` y revoca el refresh token.

### Perfil autenticado
`GET /auth/me`

Header:

`Authorization: Bearer <token>`

## 4. Pruebas

```bash
npm test
```

Las pruebas incluidas no requieren PostgreSQL: hay pruebas unitarias para bcrypt y pruebas de integración de Express/JWT con Supertest.
