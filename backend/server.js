const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Define Schema for Annotations
const annotationSchema = new mongoose.Schema({
  documentId: String,
  pageNumber: Number,
  pdfUrl: String,
  lines: [
    {
      id: String,
      type: String, // 'pencil', 'eraser', 'rect', 'circle', 'arrow', 'text'
      points: [Number], // Normalized coordinates
      brushColor: String,
      brushSize: Number,
      x: Number, // Normalized X
      y: Number, // Normalized Y
      width: Number, // Normalized width
      height: Number, // Normalized height
      text: String // For comments
    }
  ]
}, { timestamps: true });

const Annotation = mongoose.model('Annotation', annotationSchema);

// Routes
// Get annotations for a specific document
app.get('/api/annotations/:documentId', async (req, res) => {
  try {
    const annotations = await Annotation.find({ documentId: req.params.documentId });
    res.json(annotations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
});

// Save or Update annotations
app.post('/api/annotations', async (req, res) => {
  const { documentId, pageNumber, lines, pdfUrl } = req.body;
  try {
    // Find and update or create new
    const result = await Annotation.findOneAndUpdate(
      { documentId, pageNumber },
      { lines, pdfUrl },
      { upsert: true, new: true }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save annotations' });
  }
});

app.get('/', (req, res) => {
  res.send('PDF Annotation API is running...');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
