# State Management Architecture: Redux & TanStack Query

In this project, we use two complementary libraries to manage state: **Redux** (via `@reduxjs/toolkit`) and **TanStack Query** (formerly React Query). These are initialized in `src/main.jsx` using their respective context providers.

## 1. Redux `Provider`
**File**: `src/main.jsx`

### Why we use it:
The Redux `Provider` makes the global **Redux Store** available to any nested component in the app. 

*   **Client-Side State**: It manages state that belongs strictly to the user interface and doesn't necessarily need to be synced with the database immediately.
*   **Tool Settings**: We store the `activeTool` (pencil, eraser, etc.), `brushColor`, and `brushSize` here.
*   **Local Annotations**: We use Redux to keep a "Working Copy" of the annotations. This ensures that as you draw or edit, the UI is incredibly fast and responsive because it's updating a local JavaScript object in memory.

---

## 2. `QueryClientProvider`
**File**: `src/main.jsx`

### Why we use it:
The `QueryClientProvider` manages **Server State**—data that lives in your MongoDB database.

*   **Fetching Data**: It handles the `GET` request to retrieve annotations when you open a PDF.
*   **Caching**: If you switch between PDFs or refresh the page, it handles caching so we don't make unnecessary network requests.
*   **Synchronization**: It provides tools to track whether the data is loading, if there's an error, or if the data is "stale" and needs to be re-fetched.

---

## Why use BOTH? (The Hybrid Approach)

It might seem redundant to use two state managers, but they solve different problems:

| Feature | Redux (Provider) | TanStack Query (`QueryClientProvider`) |
| :--- | :--- | :--- |
| **Data Source** | Local UI / User Interaction | Remote Database (MongoDB) |
| **Latency** | Instant (Zero latency) | Network-dependent |
| **Main Goal** | Predictable UI state | Efficient data syncing & caching |
| **Example** | "Which tool is selected right now?" | "What are the comments saved for this PDF?" |

### How they work together in this project:
1.  **TanStack Query** fetches the "Official" version of annotations from MongoDB.
2.  **Redux** takes that data and keeps it in a "Working Copy" so you can draw on the canvas at 60 frames per second without waiting for the database to respond.
3.  When you click **Save**, a **Redux Thunk** sends the "Working Copy" back to the server, and TanStack Query is notified that the data has changed.

This combination gives you the **reliability** of a database with the **speed** of a local desktop application.
