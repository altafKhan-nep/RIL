# NovaCart

> A production-ready, full-stack MERN e-commerce platform with CRM/Admin Dashboard.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Live Demo

- **Frontend:** https://nova-cart-dun.vercel.app
- **Backend:** https://novacart-api-j9um.onrender.com

## Features

### Customer
- Product browsing with category filtering and search
- Product detail pages with images, reviews, and ratings
- Shopping cart with quantity controls
- Promo code validation and application
- Secure checkout with multiple payment methods
- Order tracking and history
- User profile and address management
- Wishlist functionality
- Loyalty points system

### Admin Dashboard
- Real-time analytics and KPI cards
- Product management (CRUD)
- Order management with status tracking
- Customer management
- Inventory management with stock history
- Category management with drag-to-reorder
- Banner management (hero, promo, sidebar, footer)
- Navigation management
- Promotion management with usage tracking
- Store settings (shipping, tax, payment, SEO)

### Security
- JWT authentication with bcrypt password hashing
- Role-based access control (5 roles, 34 permissions)
- HTTP security headers (Helmet)
- NoSQL injection prevention
- XSS prevention
- Rate limiting
- CORS configuration

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 6, Tailwind CSS 3, React Router v7 |
| Backend | Node.js, Express 4, Mongoose 8 |
| Database | MongoDB (Atlas) |
| Auth | JWT + bcryptjs |
| Deployment | Vercel (frontend) + Render (backend) |

## Quick Start

### Prerequisites

- Node.js v18+
- npm
- MongoDB (local or Atlas)

### Installation

```bash
# Clone repository
git clone https://github.com/altafKhan-nep/NovaCart.git
cd NovaCart

# Install all dependencies
npm run install-all
```

### Environment Setup

```bash
# Create server/.env
cat > server/.env << EOF
PORT=5001
MONGO_URI=mongodb://localhost:27017/novacart
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d
EOF
```

### Seed Database

```bash
cd server && node seed/seed.js
```

### Start Development

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5001

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@novacart.com | password123 |
| Admin | admin@novacart.com | password123 |
| Content Manager | content@novacart.com | password123 |
| Order Manager | orders@novacart.com | password123 |
| Customer | alex@novacart.com | password123 |

## Project Structure

```
NovaCart/
├── client/                  # React frontend
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── components/     # Reusable components
│   │   ├── context/        # Auth & Cart context
│   │   ├── pages/          # Page components
│   │   └── utils/          # Helper functions
│   └── package.json
├── server/                  # Express backend
│   ├── config/             # DB connection
│   ├── controllers/        # Route handlers
│   ├── middleware/          # Auth, validation
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express routes
│   ├── seed/               # Database seeder
│   └── package.json
├── docs/                    # Documentation
└── package.json             # Root package
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design and project structure |
| [Getting Started](docs/GETTING_STARTED.md) | Setup and development guide |
| [Backend](docs/BACKEND.md) | Express server and API |
| [Frontend](docs/FRONTEND.md) | React app and components |
| [API Reference](docs/API_REFERENCE.md) | Complete REST API docs |
| [Database Schema](docs/DATABASE_SCHEMA.md) | MongoDB models |
| [Deployment](docs/DEPLOYMENT.md) | Production deployment |
| [Security](docs/SECURITY.md) | Security features |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common issues |

## Development

```bash
# Install dependencies
npm run install-all

# Seed database
cd server && node seed/seed.js

# Start development servers
npm run dev

# Run API tests
cd server && node tests/api.test.js
```

## Deployment

See [Deployment Guide](docs/DEPLOYMENT.md) for full instructions.

```bash
# Frontend (Vercel)
cd client && npm run build

# Backend (Render)
# Push to GitHub and deploy via Render dashboard
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- **Email:** support@novacart.com
- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/altafKhan-nep/NovaCart/issues)
# RIL
