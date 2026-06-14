# Driver Pulse — Node.js / Express / Prisma Backend

Production-ready REST API for the Driver Pulse safety analytics platform.

## Stack

| Layer       | Technology              |
|-------------|-------------------------|
| Runtime     | Node.js 18+             |
| Framework   | Express 4               |
| ORM         | Prisma 5                |
| Database    | PostgreSQL 15+          |
| Auth        | JWT + bcrypt            |
| Validation  | Joi                     |
| Security    | Helmet, CORS            |

## Quick Start

### 1. Install dependencies
```bash
cd server
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — set your PostgreSQL DATABASE_URL and JWT_SECRET
```

### 3. Create the database
```bash
# In psql or your PostgreSQL client:
CREATE DATABASE driver_pulse;
```

### 4. Run migrations
```bash
npx prisma migrate dev --name init
```

### 5. Generate Prisma client
```bash
npx prisma generate
```

### 6. Start the server
```bash
npm run dev      # development (nodemon)
npm start        # production
```

---

## API Reference

### Authentication (public)

| Method | Endpoint       | Body                                                   |
|--------|----------------|--------------------------------------------------------|
| POST   | `/auth/signup` | `name, email, phone, username, password, vehicleNumber, vehicleType` |
| POST   | `/auth/login`  | `identifier` (username OR driverId), `password`       |

### Protected routes (require `Authorization: Bearer <token>`)

| Method | Endpoint        | Description                              |
|--------|-----------------|------------------------------------------|
| GET    | `/profile`      | Authenticated driver profile + counts    |
| GET    | `/trips`        | All trips for the driver                 |
| GET    | `/trips/:id`    | Single trip with flags                   |
| GET    | `/flags`        | All flags (`?severity=HIGH&flagType=...`)|
| GET    | `/flags/:id`    | Single flag                              |
| GET    | `/insights`     | AI insights + aggregate stats            |
| POST   | `/chat`         | Send a question `{ question }`           |
| GET    | `/chat/history` | Chat history (`?limit=50`)               |

---

## Driver ID Format

Driver IDs are auto-generated on signup:

```
DRV20250001
DRV20250002
DRV20250003
```

Format: `DRV` + current year + 4-digit zero-padded sequence.

---

## Folder Structure

```
server/
├── prisma/
│   └── schema.prisma         # Database schema
├── src/
│   ├── config/
│   │   └── prisma.js         # Prisma singleton client
│   ├── middleware/
│   │   ├── auth.js           # JWT verification
│   │   └── validate.js       # Joi request validation
│   ├── services/             # Business logic layer
│   │   ├── auth.service.js
│   │   ├── trip.service.js
│   │   ├── flag.service.js
│   │   ├── insight.service.js
│   │   └── chat.service.js
│   ├── controllers/          # Request/response handlers
│   │   ├── auth.controller.js
│   │   ├── profile.controller.js
│   │   ├── trip.controller.js
│   │   ├── flag.controller.js
│   │   ├── insight.controller.js
│   │   └── chat.controller.js
│   ├── routes/               # Route definitions
│   │   ├── auth.routes.js
│   │   ├── profile.routes.js
│   │   ├── trip.routes.js
│   │   ├── flag.routes.js
│   │   ├── insight.routes.js
│   │   └── chat.routes.js
│   └── index.js              # App entry point
├── .env.example
├── .gitignore
└── package.json
```

---

## Security Design

- **Passwords**: bcrypt with 12 salt rounds
- **JWT**: HS256, 7-day expiry, stored in Authorization header
- **Ownership**: Every protected service query filters by `driverId` from the JWT — a driver **cannot** access another driver's data
- **Helmet**: Sets secure HTTP headers
- **CORS**: Configured to accept only frontend origins
- **Validation**: All inputs validated and stripped of unknown fields before reaching the database
