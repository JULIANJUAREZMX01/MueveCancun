# Mueve Reparto Backend API

Esta es la documentación de la API del backend de Mueve Reparto.
El backend está escrito en Rust usando Axum y PostgreSQL.

## Autenticación
Todas las peticiones a endpoints protegidos (rutas `/api/stops*`, `/api/stats*`) deben incluir el token JWT en el header de autorización.
`Authorization: Bearer <token>`

## Endpoints

### POST `/api/auth/otp/request`
Envía un código OTP para verificar el número de teléfono.

**Request:**
```json
{
  "phone": "+521234567890"
}
```

### POST `/api/auth/otp/verify`
Verifica el código OTP recibido y devuelve un JWT. Registra al usuario si no existe.

**Request:**
```json
{
  "phone": "+521234567890",
  "code": "123456"
}
```
**Response:**
```json
{
  "token": "ey..."
}
```

### GET `/api/stops`
Lista las paradas del usuario autenticado.

**Response:**
```json
[
  {
    "id": "stop_uuid_o_texto",
    "user_id": "uuid",
    "address": "Calle Falsa 123",
    "status": "pending"
    // ...
  }
]
```

### POST `/api/stops/sync`
Sincroniza un lote (batch) de paradas (desde IDB al backend). Usado cuando el repartidor recobra la conexión a internet.

**Request:**
```json
{
  "stops": [
    {
      "id": "abc1234",
      "address": "Calle Falsa 123",
      // ...opcional (income, notas, status, etc.)
    }
  ]
}
```
**Response:**
```json
{
  "synced_stops": 1,
  "errors": []
}
```

### GET `/api/stats/daily`
Obtiene las estadísticas de hoy del usuario autenticado.

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "date": "2023-10-10",
  "deliveries": 10,
  "income": 500.00
}
```
