# Deployment Guide: PDF Annotation System (Production)

This guide provides step-by-step instructions to deploy your full-stack application to the cloud.

## 1. MongoDB Atlas (Cloud Database)
1.  **Sign Up**: Create a free account at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas).
2.  **Create Cluster**: Select the **M0 (Free)** tier.
3.  **Network Access**: 
    *   Go to **Network Access** > **Add IP Address**.
    *   Click **"Allow Access from Anywhere"** (0.0.0.0/0). This is necessary for Render.
4.  **Database User**: 
    *   Go to **Database Access** > **Add New Database User**.
    *   Set a username and password.
5.  **Get Connection String**:
    *   Go to **Database** > **Connect** > **Drivers**.
    *   Copy the connection string and replace `<password>` with your user password.

---

## 2. Render (Backend Deployment)
1.  **Sign Up**: Link your GitHub at [render.com](https://render.com).
2.  **New Web Service**:
    *   Select repository: `ReactVite_project_kanvas`.
3.  **Configure**:
    *   **Root Directory**: `backend`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node server.js`
4.  **Environment Variables**:
    *   `MONGODB_URI`: *Your connection string.*
    *   `PORT`: `10000`
5.  **Deploy**: Click **Create Web Service**. 
6.  **Copy URL**: Once Live, copy your URL (e.g., `https://kanvas-api.onrender.com`).

---

## 3. Vercel (Frontend Deployment)
1.  **Sign Up**: Link your GitHub at [vercel.com](https://vercel.com).
2.  **New Project**:
    *   Select repository: `ReactVite_project_kanvas`.
3.  **Configure**:
    *   **Root Directory**: `react-learning-project`
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
4.  **Environment Variables**:
    *   `VITE_API_URL`: `https://your-backend.onrender.com/api/annotations`
5.  **Deploy**: Click **Deploy**.
