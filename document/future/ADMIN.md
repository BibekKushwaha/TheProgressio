npx tsx packages/db/promote-admin.ts promote alice@example.com

POST /api/auth/admin/promote
Content-Type: application/json
x-admin-bootstrap-secret: <your ADMIN_BOOTSTRAP_SECRET from auth-service .env>

{ "email": "alice@example.com" }

POST /api/auth/admin/demote
x-admin-bootstrap-secret: <secret>

{ "email": "alice@example.com" }