# NovaCart Documentation

> A production-ready, full-stack MERN e-commerce platform with CRM/Admin Dashboard.

---

## Table of Contents

| Document | Description |
|----------|-------------|
| [Architecture](./ARCHITECTURE.md) | System architecture, tech stack, and project structure |
| [Getting Started](./GETTING_STARTED.md) | Local development setup and environment configuration |
| [Backend](./BACKEND.md) | Express server, controllers, models, middleware, and API routes |
| [Frontend](./FRONTEND.md) | React app, components, pages, context, and routing |
| [API Reference](./API_REFERENCE.md) | Complete REST API endpoint documentation |
| [Database Schema](./DATABASE_SCHEMA.md) | MongoDB/Mongoose model schemas and relationships |
| [Deployment](./DEPLOYMENT.md) | Production deployment to Vercel + Render + MongoDB Atlas |
| [Security](./SECURITY.md) | Authentication, RBAC, hardening, and best practices |
| [Troubleshooting](./TROUBLESHOOTING.md) | Common issues and solutions |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 6, Tailwind CSS 3, React Router v7 |
| Backend | Node.js, Express 4, Mongoose 8 |
| Database | MongoDB (Atlas) |
| Auth | JWT + bcryptjs |
| Deployment | Vercel (frontend) + Render (backend) |

## Quick Start

```bash
# Install dependencies
npm run install-all

# Seed database
cd server && node seed/seed.js

# Start development
npm run dev
```

Frontend: `http://localhost:5173` | Backend: `http://localhost:5001`

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@novacart.com | password123 |
| Admin | admin@novacart.com | password123 |
| Content Manager | content@novacart.com | password123 |
| Order Manager | orders@novacart.com | password123 |
| Customer | alex@novacart.com | password123 |

## Production URLs

- **Frontend:** https://nova-cart-dun.vercel.app
- **Backend:** https://novacart-api-j9um.onrender.com
