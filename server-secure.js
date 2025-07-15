
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { Parser } = require('json2csv');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Models
const bookingSchema = new mongoose.Schema({
  name: String,
  email: String,
  date: String,
  service: String,
  notes: String,
  time: String,
  archived: { type: Boolean, default: false }
});
const Booking = mongoose.model('Booking', bookingSchema);

const adminSchema = new mongoose.Schema({
  username: String,
  password: String
});
const Admin = mongoose.model('Admin', adminSchema);

// Middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const validateBooking = (req, res, next) => {
  const { name, email, date, service, time } = req.body;
  if (!name || !email || !date || !service || !time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  next();
};

// Email config
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Routes
app.post('/api/bookings', validateBooking, async (req, res) => {
  try {
    const newBooking = new Booking(req.body);
    await newBooking.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: req.body.email,
      subject: 'Booking Confirmation',
      text: `Hi ${req.body.name}, your ${req.body.service} on ${req.body.date} at ${req.body.time} is confirmed.`
    });

    res.status(201).json({ message: 'Booking saved and email sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save booking or send email' });
  }
});

app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ archived: false });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching bookings' });
  }
});

app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    await Booking.findByIdAndUpdate(req.params.id, { archived: true });
    res.json({ message: 'Booking archived' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive booking' });
  }
});

app.post('/api/admin/register', authenticateToken, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  const hashedPassword = await bcrypt.hash(password, 10);
  const newAdmin = new Admin({ username, password: hashedPassword });
  await newAdmin.save();
  res.status(201).json({ message: 'Admin created' });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin || !await bcrypt.compare(password, admin.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username: admin.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
