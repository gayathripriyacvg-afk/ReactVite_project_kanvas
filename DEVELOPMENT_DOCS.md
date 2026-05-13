# PDF Annotation Dashboard: Technical Documentation

This document provides a comprehensive breakdown of the architecture, implementation, and technologies used in the PDF Annotation Dashboard.

## 1. Technology Stack & Rationale

| Technology | Purpose | Why it was chosen |
| :--- | :--- | :--- |
| **Vite + React** | Frontend Framework | Fast build times, modern developer experience, and efficient component-based UI. |
| **Konva / React-Konva** | Canvas Rendering | Handles complex 2D shapes (lines, rectangles, circles) with high performance and object-based manipulation. |
| **PDF.js (react-pdf)** | PDF Rendering | The industry standard for rendering PDF documents in the browser with high fidelity. |
| **PDF-Lib** | PDF Manipulation | Allows low-level editing of PDF files (merging, drawing) directly in the client without a backend processing server. |
| **Redux Toolkit** | UI State Management | Manages "Working Copy" state (tool selection, unsaved marks) across the entire application predictably. |
| **TanStack Query** | Server State Management | Automates data fetching, caching, and background syncing with the MongoDB database. |
| **MongoDB + Node/Express** | Backend & Database | A flexible NoSQL schema allows us to store complex, varying annotation data (points, text, dimensions) easily. |

---

## 2. Step-by-Step Implementation Detail

### Step 1: High-Fidelity PDF Rendering
We use `react-pdf` to render the document. The key is to capture the exact `viewport` dimensions during the `onLoadSuccess` event. This gives us the "Page Box" size needed to scale our drawing canvas.

### Step 2: The Interactive Annotation Layer
We place an HTML5 Canvas (`KonvaCanvas.jsx`) exactly on top of the PDF.
*   **Coordinate Normalization**: This is the most critical part. Instead of saving a point as `x=500`, we save it as `x = 500 / PageWidth`. This ensures your drawings stay in the correct position whether you are on a mobile phone or a 4K monitor.
*   **Tool Logic**: We use a `switch` statement to handle different drawing modes:
    *   `pencil`: Adds points to an array.
    *   `rect/circle`: Calculates dimensions based on mouse drag.
    *   `eraser`: Uses `destination-out` to "cut holes" in existing drawings.

### Step 3: Global State & Persistence
*   **Local UI**: When you draw, Redux updates instantly. This makes the UI feel fast (60 FPS).
*   **LocalStorage**: We sync the Redux state to `localStorage` so that if the user refreshes, their work is not lost even if they haven't clicked "Save" yet.
*   **Cloud Sync**: When "Save" is clicked, a Redux Thunk sends the normalized data to MongoDB via an Axios POST request.

### Step 4: Accurate PDF Export
When the user clicks "Export":
1.  The app fetches the original PDF bytes.
2.  It uses `pdf-lib` to open the document.
3.  **Coordinate Mapping**: We convert our normalized `(0-1)` coordinates back into PDF "Points."
    *   *Note*: PDF coordinates start from the bottom-left, while the browser starts from the top-left. We handle this inversion during the export.
4.  **Graphics Rendering**: We loop through all annotations and draw the equivalent shapes into the PDF's permanent graphics layer.
5.  **Auto-Download**: The modified PDF is saved and offered as a download.

---

## 3. Deployment & Environment
The project is split into two parts:
1.  **Backend (`/backend`)**: Hosted on **Render**. It connects to **MongoDB Atlas**.
2.  **Frontend (`/react-learning-project`)**: Hosted on **Vercel**. It talks to the Render API using an environment variable `VITE_API_URL`.

---

## 4. Key Features Summary
*   **Multi-Page Support**: Tracks different annotations for every page.
*   **State Persistence**: Remembers your current page and all marks across browser refreshes.
*   **Professional Tools**: Includes pencil, eraser, shapes, and text comments.
*   **Network Optimized**: Uses TanStack Query to minimize database load.
