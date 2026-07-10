# PRMS Web Admin Portal

React + TypeScript admin portal for the Patient Referral Management System (Kenya).

## Project Structure

```
src/
├── app/                      # Entry: App.tsx, router.tsx, store.ts
├── features/                 # Feature-first modules (mirrors API)
│   ├── auth/                 # Login, 2FA, forgot password, auth slice
│   ├── dashboard/            # System Admin + Hospital Admin dashboards
│   ├── hospitals/            # Hospital list, detail, approve/suspend
│   ├── users/                # Staff list, add, edit, suspend
│   ├── reports/              # Trends chart, county chart, performance table
│   └── audit-logs/           # Immutable audit log viewer
├── shared/
│   ├── api/                  # Axios client (auto-attach JWT, refresh-once)
│   ├── components/
│   │   ├── layout/           # AppShell, Sidebar, TopBar
│   │   └── ui/               # Button, DataTable, FormField, KPICard, …
│   ├── constants/            # ROUTES, PERMISSIONS
│   ├── hooks/                # useAuth, useDebounce, usePagination, usePermissions
│   ├── pages/                # Profile, Unauthorized, NotFound
│   └── utils/                # format.utils (dates, masking)
├── theme/                    # MUI theme + design tokens
├── scss/                     # globals.scss (CSS vars, layout, triage borders)
└── types/                    # All TypeScript interfaces (mirrors API reference)
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:3000/api/v1

# 3. Start dev server
npm run dev        # → http://localhost:5173

# 4. Build for production
npm run build
```

## Role-Based Access

| Route               | System Admin | Hospital Admin |
|---------------------|:---:|:---:|
| `/dashboard`        | ✅  | ✅  |
| `/hospitals`        | ✅  | ❌  |
| `/users`            | ❌  | ✅  |
| `/reports`          | ✅  | ✅  |
| `/audit-logs`       | ✅  | ❌  |

All routes are guarded by `<ProtectedRoute allowedRoles={[...]} />` in `router.tsx`.

## Key Patterns

- **API calls** — all go through `src/shared/api/api-client.ts` (auto-JWT, refresh-once on 401)
- **Server state** — TanStack Query (`useQuery` / `useMutation`); never put server data in Redux
- **Global UI state** — Redux Toolkit (`authSlice`)
- **Forms** — React Hook Form + Zod; schema validation mirrors backend Zod schemas
- **Notifications** — `useToast()` from `Toast.tsx` (wrap `<App />` with `<ToastProvider>` once)
- **RBAC** — `usePermissions()` hook; `ProtectedRoute` for route-level enforcement
- **Pagination** — `usePagination()` hook; all lists use `PaginationBar`

## API Reference

All endpoints implemented here map 1:1 to `PRMS_API_Reference_v1.0.md`.
See that document for full request/response schemas and error codes.
