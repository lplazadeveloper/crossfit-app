# CrossFit App 🏋️

Plataforma de programación CrossFit para coaches y atletas.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| Backend | ASP.NET Core 8 + C# |
| Base de datos | PostgreSQL 16 |
| ORM | Entity Framework Core 8 |
| Auth | Google OAuth 2.0 + JWT |
| Almacenamiento | Cloudflare R2 (compatible S3) |
| Deploy sugerido | Railway / Render / Azure |

---

## Estructura del proyecto

```
crossfit-app/
├── backend/
│   ├── CrossFit.Core/          # Entidades, DTOs, interfaces
│   ├── CrossFit.Infrastructure/ # Repositorios, EF, servicios
│   └── CrossFit.API/           # Controllers, middleware, Program.cs
└── frontend/
    └── src/
        ├── api/                # Cliente axios + servicios
        ├── components/         # UI components, calendar, session
        ├── pages/              # Login, settings, athletes
        ├── store/              # Zustand (auth, branding)
        ├── types/              # DTOs TypeScript
        └── styles/             # CSS global + tokens
```

---

## Puesta en marcha

### 1. Prerrequisitos
- .NET 8 SDK
- Node.js 20+
- PostgreSQL 16
- Cuenta de Cloudflare R2 (o AWS S3)
- Google Cloud project con OAuth 2.0

---

### 2. Backend

```bash
cd backend/CrossFit.API

# Edita appsettings.json con tus credenciales:
# - ConnectionStrings.DefaultConnection  → tu cadena de PostgreSQL
# - Jwt.Key                              → string aleatorio de 32+ chars
# - Google.ClientId                      → de Google Cloud Console
# - Storage.*                            → credenciales R2/S3
```

```bash
# Instalar herramientas EF
dotnet tool install --global dotnet-ef

# Crear y aplicar migraciones
dotnet ef migrations add InitialCreate --project ../CrossFit.Infrastructure
dotnet ef database update

# Arrancar
dotnet run
# → http://localhost:5000
# → Swagger: http://localhost:5000/swagger
```

---

### 3. Frontend

```bash
cd frontend
npm install
```

Crea `.env.local`:
```
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
```

```bash
npm run dev
# → http://localhost:5173
```

---

### 4. Crear la primera organización

Crea un registro en la tabla `Organizations` directamente en PostgreSQL:

```sql
INSERT INTO "Organizations" (
  "Id", "Name", "Slug", "PrimaryColor", "SecondaryColor", "AccentColor",
  "Plan", "IsActive", "IsDeleted", "CreatedAt", "UpdatedAt"
) VALUES (
  gen_random_uuid(),
  'LPP Program',
  'lpp-program',
  '#E63946', '#1D3557', '#F1FAEE',
  0, true, false,
  now(), now()
);
```

Después el primer usuario que haga login con `lpp-program` como código de organización será **Athlete** por defecto. Desde SQL puedes subirle a HeadCoach:

```sql
UPDATE "Users" SET "Role" = 2 WHERE "Email" = 'tu@email.com';
```

---

## Roles

| Rol | Descripción |
|---|---|
| `HeadCoach` (2) | Acceso total + cambio de branding + gestión de roles |
| `Coach` (1) | Crear/asignar programas, ver atletas, responder feedback |
| `Athlete` (0) | Ver sus sesiones, marcar como completadas, subir feedback |

---

## Deploy en producción

### Backend (Railway)
1. Crea un proyecto Railway
2. Añade PostgreSQL como servicio
3. Conecta el repo, Railway detecta .NET automáticamente
4. Configura las variables de entorno

### Frontend (Vercel)
1. Conecta el repo
2. Build command: `npm run build`
3. Output: `dist`
4. Variables: `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`

---

## Seguridad implementada

- ✅ JWT con expiración corta (15 min) + refresh token (30 días)
- ✅ Rate limiting por IP (10 req/min en auth, 300 req/min general)
- ✅ CORS restringido a dominios autorizados
- ✅ Multitenancy: cada org ve solo sus datos (OrganizationId en cada query)
- ✅ Soft deletes (no se borran datos, se marcan como eliminados)
- ✅ Validación de tipos MIME y tamaño en uploads
- ✅ RBAC: HeadCoach > Coach > Athlete
- ✅ HTTPS obligatorio
- ✅ Global exception handler (no expone stack traces)

---

## Licencia
MIT
