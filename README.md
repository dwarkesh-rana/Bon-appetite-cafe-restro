# Bon Appetite Cafe & Restro 🍽️✨
An ultra-luxury, high-end online reservation, waiting-list management, and dine-in mobile table ordering system with live notifications and security verification.

---

## 🏗️ Architecture & Features

This repository is split into two primary components:
1. **Frontend (`/`)**: A cinematic, responsive web portal built with **React, Vite, Framer Motion, and Tailwind CSS**.
   - Elegant dark/light luxury theme options.
   - Interactive table booking panel with live slot availability tracker.
   - Table-specific QR Code detection that opens a custom dine-in ordering panel.
   - Client reservation history lookup and instant self-cancellation.
2. **Backend (`/server`)**: A robust REST API built with **Express, TypeScript, and Node.js**.
   - **Database**: Integrates with a live PostgreSQL instance via **Supabase** (with an automated in-memory mock fallback if credentials are omitted).
   - **Email Notifications**: Automatic invitations with 5-star styling dispatched via **Nodemailer** SMTP.
   - **WhatsApp Alerts**: Notifications sent via the **Twilio API**.
   - **Table Allocation**: Smart table matching logic that groups tables or maps them dynamically by party size to prevent double bookings.
   - **Order Session Security**: Hashed authentication tokens to lock and track active dining table orders.

---

## 🚀 Setup & Local Execution

### Prerequisites
- Node.js (v18+) and npm installed.

### 1. Backend Server Setup
Navigate to the `server` directory, copy the template configuration, and install dependencies:
```bash
cd server
cp .env.example .env
npm install
```
Configure your environment variables in `.env` (Supabase, Nodemailer, Twilio, and a secure `JWT_SECRET`). If left empty, the server automatically defaults to an in-memory mock database and logs all email/WhatsApp notices to standard output.

Start the development server:
```bash
npm run dev
```
The backend server runs on `http://localhost:5000`.

### 2. Frontend Setup
In the project root, copy the environment file and install dependencies:
```bash
cd ..
cp .env.example .env
npm install
```
Start the frontend development server:
```bash
npm run dev
```
The frontend application will boot at `http://localhost:5173/`.

---

## 🔒 GitHub & Production Deployment

To safely push to GitHub, standard sensitive files and builds have been excluded in `.gitignore`. 

### 1. Deploying the Backend
You can host the Express backend on platforms like **Render**, **Railway**, or **Heroku**:
1. Create a new Web Service pointing to your GitHub repository.
2. Set the root directory of the build to `server`.
3. Set the build command to `npm run build` (runs `tsc` compiler).
4. Set the start command to `npm start` (runs `node dist/index.js`).
5. Configure all variables in `.env.example` as environment variables on your hosting provider.

### 2. Deploying the Database
1. Create a new database project on [Supabase](https://supabase.com).
2. Execute the database layout script found in `schema.sql` inside the Supabase SQL Editor to provision the tables, sequences, and the `prevent_double_booking` trigger.
3. Paste your Supabase project URL and service role key into your backend's environment variables.

### 3. Deploying the Frontend
You can host the Vite frontend on **Vercel**, **Netlify**, or **GitHub Pages**:
1. Connect your repository to the hosting platform.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. Add the environment variable `VITE_API_URL` pointing to your deployed backend's API endpoint (e.g. `https://api.yourdomain.com/api`).
