# 🏛️ GLMS — Government Leave Management System
## ប្រព័ន្ធគ្រប់គ្រងច្បាប់ឈប់សម្រាក — អង្គភាពប្រឆាំងអំពើពុករលួយ

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend API | NestJS 10 + TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma 5 (Schema Folder) |
| Auth | JWT (Access 15m + Refresh 7d) + RBAC |
| Frontend | Vue 3 + Vuetify 3 + Pinia |
| Container | Docker + Docker Compose |

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- Node.js 20+
- PostgreSQL 16 (or Docker)
- npm

### 1. Clone & Setup
```bash
git clone <repo>
cd glms-project
```

### 2. Backend
```bash
cd backend
cp .env.example .env          # fill in DATABASE_URL + JWT secrets

# Start PostgreSQL via Docker
docker run -d --name glms-pg \
  -e POSTGRES_DB=glms_db \
  -e POSTGRES_USER=glms_user \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 postgres:16-alpine

npm install
npx prisma generate
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts

npm run start:dev
# ✅ API: http://localhost:3000
# ✅ Swagger: http://localhost:3000/api/docs
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env          # VITE_API_URL=http://localhost:3000
npm install
npm run dev
# ✅ App: http://localhost:5173
```

---

## 🐳 Docker (Production)
```bash
cp .env.example .env          # edit secrets
docker-compose up --build -d
# ✅ App:     http://localhost
# ✅ API:     http://localhost:3000
# ✅ Swagger: http://localhost:3000/api/docs
```

---

## 👤 Default Login Credentials (After Seed)

| Email | Password | Role |
|-------|----------|------|
| admin@moi.gov.kh | Admin@2025! | SYSTEM_ADMIN |
| chandara@moi.gov.kh | Staff@2025! | EMPLOYEE |
| naris@moi.gov.kh | Staff@2025! | OFFICE_CHIEF |
| sopheak@moi.gov.kh | Staff@2025! | DEPARTMENT_CHIEF |
| sophal@moi.gov.kh | Staff@2025! | HR_OFFICER |
| sreyneang@moi.gov.kh | Staff@2025! | DIRECTOR_GENERAL |
| sokheng@moi.gov.kh | Staff@2025! | INSTITUTION_HEAD |

---

## 📁 Prisma Schema (1 Model = 1 File)
```
prisma/schema/
├── 00_base.prisma           generator + datasource
├── 01_enums.prisma          all enums
├── 02_user.prisma           User model
├── 03_role.prisma           Role model
├── 04_permission.prisma     Permission model
├── 05_user_role.prisma      UserRole pivot
├── 06_role_permission.prisma RolePermission pivot
├── 07_user_permission.prisma UserPermission override
├── 08_delegation.prisma     Delegation (temp auth transfer)
├── 09_refresh_token.prisma  RefreshToken (JWT rotation)
├── 10_org_unit.prisma       OrgUnit (tree structure)
├── 11_position.prisma       Position (job titles)
├── 12_leave_type.prisma     LeaveType (8 types)
├── 13_leave_balance.prisma  LeaveBalance (per user/year)
├── 14_public_holiday.prisma PublicHoliday (Cambodia)
├── 15_workflow_definition.prisma  WorkflowDefinition
├── 16_workflow_step.prisma        WorkflowStep
├── 17_workflow_instance.prisma    WorkflowInstance
├── 18_workflow_assignment.prisma  WorkflowAssignment
├── 19_leave_request.prisma  LeaveRequest (main doc)
├── 20_leave_approval.prisma LeaveApproval (audit)
├── 21_leave_attachment.prisma     LeaveAttachment
├── 22_leave_history.prisma  LeaveHistory (trail)
├── 23_notification.prisma   Notification
├── 24_file_storage.prisma   FileStorage
└── 25_audit_log.prisma      AuditLog
```

---

## 🔄 API Endpoints Summary

### Auth
- `POST /auth/login` — Login
- `POST /auth/refresh` — Refresh token
- `POST /auth/logout` — Logout
- `GET  /auth/me` — Current user profile

### Leave Requests
- `POST /leave-requests` — Submit request
- `GET  /leave-requests/my` — My requests
- `GET  /leave-requests/queue` — Approval queue
- `POST /leave-requests/:id/approve` — Approve/Reject/Return
- `POST /leave-requests/:id/cancel` — Cancel

### Reports
- `GET /reports/dashboard` — Stats dashboard
- `GET /reports/leave` — Leave report
- `GET /reports/summary` — By department
- `GET /reports/audit-logs` — Audit trail


---

## ⚠️ Prisma 7 — Important Notes

### Schema Folder (1 model = 1 file)
This project uses **Prisma Schema Folder** feature (stable in Prisma 7).

All 26 model files are in `prisma/schema/`:
```
prisma/schema/
├── 00_base.prisma      ← generator + datasource
├── 01_enums.prisma     ← all enums
├── 02_user.prisma      ← User model
... (24 more files)
└── 25_audit_log.prisma ← AuditLog model
```

### Config File (prisma.config.ts)
Prisma 7 uses `prisma.config.ts` at project root:
```ts
import { defineConfig } from 'prisma/config'
export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema',
})
```

### Breaking Changes from Prisma 5/6 → 7
| Feature | Old (v5/6) | New (v7) |
|---|---|---|
| Schema folder | `previewFeatures = ["prismaSchemaFolder"]` | Stable — no previewFeatures needed |
| Config | `package.json "prisma.schema"` only | `prisma.config.ts` (recommended) |
| Node.js | 18+ | **20.19+ or 22.12+ or 24+** |

### Node.js Requirement
Prisma 7 requires **Node.js ≥ 20.19**:
```bash
node --version  # must be v20.19+ or v22.12+
nvm use 22      # if using nvm
```
