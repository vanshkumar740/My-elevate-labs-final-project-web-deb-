const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

mongoose.connect('mongodb://localhost:27017/saas', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  verified: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email',
      html: `<p>Click <a href="http://localhost:3000/verify?email=${encodeURIComponent(email)}">here</a> to verify your email.</p>`
    };
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Sign-up successful! Check your email to verify.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error signing up.' });
  }
});

app.get('/verify', async (req, res) => {
  const { email } = req.query;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send('User not found.');
    }
    await User.updateOne({ email }, { verified: true });
    res.redirect('/thank-you.html');
  } catch (error) {
    console.error(error);
    res.status(500).send('Verification failed.');
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
