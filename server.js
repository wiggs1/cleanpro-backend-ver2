const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;




app.use(cors({
  origin: 'https://whelanswebservices.com', // allow only your frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({ message: "API is working!" });
});

// Booking model (you can define this inline or import from a separate file)
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  name: String,
  email: String,
  date: String,
  service: String,
  time: String,
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', bookingSchema);

// Booking API route
app.post('/api/bookings', async (req, res) => {
  try {
    console.log('Incoming booking:', req.body);
    const newBooking = new Booking(req.body);
    await newBooking.save();
    res.status(201).json({ message: 'Booking saved successfully' });
  } catch (err) {
    console.error('Booking Error:', err.message);
    res.status(500).json({ error: 'Failed to save booking' });
  }
});


// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
