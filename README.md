# GTL & HRMS — Unified Platform

Unified **Global Time Logger (GTL)** and **Human Resource Management System (HRMS)**. A single web application that replaces two legacy PHP systems. Employees log their daily work, mark attendance, apply for leaves, and managers can approve timesheets, view reports, and track team performance.

---

## What You Need Before Starting (Prerequisites)

You need **3 things** installed on the testing PC. If any of these are missing, the app won't run.

### 1. Node.js (version 18 or higher)

Node.js runs the backend server and the frontend dev server.

**How to check if you have it:**
```
node --version
```
If it shows `v18.x.x` or `v20.x.x` or higher, you're good. If not:

**How to install:**
- Go to https://nodejs.org
- Download the **LTS** version (the big green button)
- Run the installer, click Next through everything (keep all defaults)
- Restart your terminal/command prompt after installing

### 2. PostgreSQL (version 15 or higher)

PostgreSQL is the database. All employee data, attendance records, and time entries are stored here.

**How to check if you have it:**
```
psql --version
```

**How to install:**
- Go to https://www.postgresql.org/download/
- Download the Windows installer
- During installation:
  - Set the **password** to: `angular123` (or whatever you want, but you'll need to update the config)
  - Set the **port** to: `5433` (or keep default `5432`, but update the config)
  - Keep everything else as default
- After install, the PostgreSQL service should start automatically

### 3. npm (comes with Node.js)

npm is the package manager. It installs all the libraries the app needs. It comes bundled with Node.js, so if you installed Node.js, you already have npm.

```
npm --version
```

---

## Step-by-Step Setup (First Time Only)

Follow these steps **in order**. Each step depends on the previous one.

### Step 1: Extract the ZIP

Extract the `unified_app` folder to any location on the PC. For example:
```
C:\Projects\unified_app\
```

### Step 2: Create the Database

Open **pgAdmin** (installed with PostgreSQL) or use the command line:

**Option A: Using pgAdmin (GUI)**
1. Open pgAdmin from Start Menu
2. Connect to your local PostgreSQL server
3. Right-click on "Databases" > "Create" > "Database"
4. Name it: `unified_app`
5. Click Save

**Option B: Using Command Line**
```
psql -U postgres -p 5433
```
Enter your PostgreSQL password when prompted, then:
```sql
CREATE DATABASE unified_app;
\q
```

### Step 3: Configure the Database Connection

Open this file in any text editor (Notepad works):
```
unified_app\backend-nest\.env
```

It should look like this:
```
DATABASE_URL=postgresql://postgres:angular123@localhost:5433/unified_app
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=8h
PORT=4000
```

**Update if needed:**
- `postgres` = your PostgreSQL username (default is `postgres`)
- `angular123` = your PostgreSQL password (whatever you set during install)
- `5433` = your PostgreSQL port (default is `5432`, we use `5433`)
- `unified_app` = the database name from Step 2

### Step 4: Install Backend Dependencies

Open a terminal/command prompt. Navigate to the backend folder:
```
cd C:\Projects\unified_app\backend-nest
npm install
```

This downloads all the backend libraries. Wait for it to finish (may take 2-5 minutes the first time).

### Step 5: Create Database Tables

Still in the `backend-nest` folder:
```
npx prisma db push
```

This creates all 34 database tables. You should see:
```
Your database is now in sync with your Prisma schema.
```

Then generate the Prisma client:
```
npx prisma generate
```

### Step 6: Import Data (if you have a database dump)

If you have a `.sql` dump file with existing data:
```
psql -U postgres -p 5433 -d unified_app -f path\to\dump.sql
```

If you're starting fresh (no data), skip this step. The app will work with empty tables.

### Step 7: Install Frontend Dependencies

```
cd C:\Projects\unified_app\frontend
npm install
```

Wait for it to finish.

### Step 8: Run the Application

Still in the `frontend` folder:
```
npm run dev
```

**This single command starts EVERYTHING:**
- Backend API server on port 4000
- Frontend web server on port 3002
- Automatically installs any missing packages

You should see output like:
```
[API] Nest application successfully started
[WEB] VITE v5.x.x ready in xxx ms
[WEB] Local: http://localhost:3002/
```

### Step 9: Open in Browser

Open your web browser and go to:
```
http://localhost:3002
```

You should see the login page.

**Default login credentials:**
- Username: `abdul.mannan` (super admin)
- Password: `welcome`

---

## Running the App (After First-Time Setup)

Once you've done the setup above, you only need **one command** every time:

```
cd C:\Projects\unified_app\frontend
npm run dev
```

That's it. It auto-installs any new packages and starts both servers.

To **stop** the app: press `Ctrl + C` in the terminal.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend | NestJS (TypeScript) | API server, business logic |
| Frontend | React 18 + Vite + Ant Design | Web interface |
| Database | PostgreSQL + Prisma ORM | Data storage |
| Auth | JWT + Argon2id | Login security |
| State | Zustand + TanStack Query | Frontend data management |
| Charts | Recharts | Dashboard visualizations |
| Docs | Swagger (OpenAPI) | API documentation |

## Ports

| Service | Port | URL |
|---|---|---|
| Frontend (web) | 3002 | http://localhost:3002 |
| Backend (API) | 4000 | http://localhost:4000 (internal only) |
| PostgreSQL | 5433 | localhost:5433 |
| Swagger Docs | 3002 | http://localhost:3002/api/docs |

The backend only accepts connections from localhost (not from other computers). All traffic goes through the frontend proxy on port 3002.

## Project Structure

```
unified_app/
├── backend-nest/           # NestJS API server
│   ├── src/
│   │   ├── auth/           # JWT login, password reset
│   │   ├── users/          # User CRUD, teams, managers
│   │   ├── attendance/     # Check-in/out, WFH, requests, reports
│   │   ├── gtl/            # Time entries, approvals, reports
│   │   ├── leaves/         # Leave applications, balance
│   │   ├── profiles/       # Employee profiles, education
│   │   ├── teams/          # Team CRUD, sub-teams
│   │   ├── roles/          # Role management
│   │   └── common/         # Guards, helpers
│   ├── prisma/
│   │   └── schema.prisma   # Database schema (34 tables)
│   └── .env                # Database connection config
├── frontend/               # React web app
│   ├── src/
│   │   ├── pages/          # 47 pages (dashboard, reports, etc.)
│   │   ├── components/     # Layout, sidebar, header
│   │   ├── api/            # API client functions
│   │   ├── store/          # Auth state management
│   │   └── theme/          # Company branding (4 themes)
│   └── vite.config.ts      # Dev server + API proxy config
├── docs/                   # ERD diagrams, sprint plans
└── README.md               # This file
```

## Key Features

- **124 API endpoints** with Swagger documentation
- **Role-based access**: Employee < Team Lead < Admin < Super Admin
- **Multi-team, multi-lead**: Employees can belong to multiple teams
- **Anti-gaming**: Hours calculated from attendance only, 12h cap, missed checkout detection
- **4 company brands**: PowerSoft19, Venturetronics, Raythorne, AngularSpring (auto-detected from employee profile)
- **Dashboard**: Heatmaps, bar charts, attendance overview, team stats
- **Reports**: Team Report, General Report, Employees Report, Daily Attendance, Resource/Project Allocation

## Environment Variables

```env
# backend-nest/.env
DATABASE_URL=postgresql://postgres:angular123@localhost:5433/unified_app
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=8h
PORT=4000
SWAGGER_USER=admin
SWAGGER_PASS=gtl@2026
```

## Troubleshooting

### "Cannot connect to database"
- Make sure PostgreSQL is running (check Windows Services for "postgresql")
- Make sure the port, username, and password in `.env` match your PostgreSQL setup
- Make sure the `unified_app` database exists

### "npm run dev" shows errors
- Delete `node_modules` in both folders and reinstall:
  ```
  cd backend-nest
  rm -rf node_modules
  npm install
  npx prisma generate
  cd ../frontend
  rm -rf node_modules
  npm install
  npm run dev
  ```

### "Port 4000 already in use"
- Another instance is already running. Kill it:
  ```
  taskkill /F /IM node.exe
  ```
  Then try again.

### "Prisma client not generated"
- Run this in the backend-nest folder:
  ```
  npx prisma generate
  ```

### Login doesn't work / "Invalid credentials"
- Make sure you imported the database dump (Step 6)
- Default password for most users: `welcome`
- If starting fresh, you need to seed the database with at least one admin user

### Page shows blank / API errors
- Open browser DevTools (F12) > Console tab to see error messages
- Make sure both `[API]` and `[WEB]` are running in the terminal
- Check that the backend started successfully (look for "Nest application successfully started")

## Security Notes

- Backend listens on `127.0.0.1` only (not externally accessible)
- All API traffic goes through frontend proxy on port 3002
- JWT tokens expire after 8 hours
- Swagger docs are password protected
- Sensitive data (phone, RFID) visible only to super admin
- Argon2id password hashing (auto-upgraded from legacy MD5)
