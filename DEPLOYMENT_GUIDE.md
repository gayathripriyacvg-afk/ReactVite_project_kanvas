# Deployment Guide: PDF Annotation System

This guide provides step-by-step instructions to deploy your full-stack application to the cloud.

## 1. MongoDB Atlas (Database)
1.  **Sign Up**: Create a free account at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas).
2.  **Create Cluster**: Follow the "Build a Database" wizard and select the **M0 (Free)** tier.
3.  **Network Access**: 
    *   Go to **Network Access** > **Add IP Address**.
    *   Click **"Allow Access from Anywhere"** (0.0.0.0/0) for development ease.
4.  **Database User**: 
    *   Go to **Database Access** > **Add New Database User**.
    *   Create a user with a username and a strong password (remember these).
5.  **Get Connection String**:
    *   Go to **Database** > **Connect** > **Drivers**.
    *   Copy the connection string (it looks like `mongodb+srv://<db_username>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`).
    *   Replace `<password>` with your actual password.

---

## 2. Render (Backend Deployment)
1.  **Sign Up**: Connect your GitHub account at [render.com](https://render.com).
2.  **New Web Service**:
    *   Click **New+** > **Web Service**.
    *   Select your repository (`ReactVite_project1`).
3.  **Configure**:
    *   **Root Directory**: `backend`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node server.js`
    *   **Environment Variables**:
        *   `MONGODB_URI`: *Paste your MongoDB Atlas connection string from Step 1.*
        *   `PORT`: `10000` (Render's default)
4.  **Deploy**: Click **Create Web Service**. 
5.  **Copy URL**: Once deployed, copy your backend URL (e.g., `https://your-backend.onrender.com`).

---

## 3. Vercel (Frontend Deployment)
1.  **Sign Up**: Connect your GitHub account at [vercel.com](https://vercel.com).
2.  **Import Project**:
    *   Select your repository (`ReactVite_project1`).
3.  **Configure**:
    *   **Framework Preset**: Vite
    *   **Root Directory**: `react-learning-project`
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
    *   **Environment Variables**:
        *   `VITE_API_URL`: *Paste your Render Backend URL + `/api/annotations`* 
        *   (Example: `https://your-backend.onrender.com/api/annotations`)
4.  **Deploy**: Click **Deploy**.

---

## 4. Final Step: CORS Configuration
To allow your frontend to talk to your backend, you must ensure the backend allows requests from your Vercel URL.

1.  Go to your **Render Dashboard** for the backend service.
2.  Update the `CORS` middleware in `server.js` if you want to be specific, or keep it as is (currently `app.use(cors())` allows everything).

> [!IMPORTANT]
> Always use environment variables for sensitive data like Database URIs. Never commit your `.env` file to Git (it is already ignored in our current setup).

## Troubleshooting
- **Mixed Content Error**: Ensure your `VITE_API_URL` uses `https://` and not `http://`.
- **Database Connection**: Ensure the MongoDB Atlas Network Access is set to allow the IP of the Render server (Allowing 0.0.0.0/0 is the easiest way).
- **Vite Environment**: Remember that variables in Vite must start with `VITE_` to be accessible in the browser.
