const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

// --- SCHEMAS ---

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Define Schema for Annotations
const annotationSchema = new mongoose.Schema({
  documentId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Added userId
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

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- ROUTES ---

// AUTH ROUTES
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, name });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(400).json({ error: 'Registration failed (Email might already exist)' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET || 'your_super_secret_key');
  res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
});

// ANNOTATION ROUTES (Update to use userId if authenticated)
// Get annotations for a specific document
app.get('/api/annotations/:documentId', async (req, res) => {
  const { documentId } = req.params;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  let query = { documentId };
  
  // If user is logged in, filter by their specific annotations
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key');
      query.userId = decoded.userId;
    } catch (e) {
      // If token is invalid, we can decide to show public or nothing
    }
  }

  try {
    const annotations = await Annotation.find(query);
    res.json(annotations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
});

// Save or Update annotations
app.post('/api/annotations', async (req, res) => {
  const { documentId, pageNumber, lines, pdfUrl, userId } = req.body;
  try {
    // Find and update or create new
    const result = await Annotation.findOneAndUpdate(
      { documentId, pageNumber, userId },
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
