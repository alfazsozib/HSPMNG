const express   = require('express');
const mongoose  = require('mongoose');
const bcrypt    = require('bcryptjs');
const cors      = require('cors');
const path      = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// 1) Setup
app.use(express.json());
app.use(cors());

// 2) MongoDB
mongoose.connect(
  'mongodb+srv://aspro1141:u8cfC7vjC4P5rGyu@donate.nyuu3rd.mongodb.net/hopsease?retryWrites=true&w=majority',
  { useNewUrlParser: true, useUnifiedTopology: true }
).then(() => console.log('MongoDB connected'))
 .catch(err => console.error(err));

// 3) Schemas & Models
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, enum: ['admin','doctor','patient'], default: 'patient' }
}));

const Patient = mongoose.model('Patient', new mongoose.Schema({
  name:String, email:String, phone:String, disease:String
}));
const Doctor = mongoose.model('Doctor', new mongoose.Schema({
  name:String, specialty:String, email:String, phone:String, photo:String
}));
const Appointment = mongoose.model('Appointment', new mongoose.Schema({
  patientName:String, patientEmail:String,
  doctorId:{ type: mongoose.Schema.Types.ObjectId, ref:'Doctor' },
  time:Date, createdAt:{ type:Date, default:Date.now }
}));
const Staff = mongoose.model('Staff', new mongoose.Schema({
  name:String, role:String, email:String, phone:String
}));
const Emergency = mongoose.model('Emergency', new mongoose.Schema({
  caseId:String, patientName:String, type:String
}));

// 4) Auth Routes

// Signup
app.post('/api/signup', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ success:false, message:'Missing fields' });

  if (await User.findOne({ email }))
    return res.status(409).json({ success:false, message:'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  await new User({ name, email, passwordHash, role: role||'patient' }).save();
  res.json({ success:true, message:'Signup successful' });
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success:false, message:'Missing fields' });

  const user = await User.findOne({ email });
  if (!user || !await bcrypt.compare(password, user.passwordHash))
    return res.status(401).json({ success:false, message:'Invalid credentials' });

  // return role for client-side gating
  res.json({ success: true, role: user.role });
});

// 5) CRUD (no auth)

// Patients
app.get('/api/patients',    async (req, res) => res.json(await Patient.find()));
app.post('/api/patients',   async (req, res) => res.json(await new Patient(req.body).save()));
app.delete('/api/patients/:id', async (req, res) => {
  await Patient.deleteOne({ _id: req.params.id });
  res.json({ success:true });
});

// Doctors
app.get('/api/doctors',     async (req, res) => res.json(await Doctor.find()));
app.post('/api/doctors',    async (req, res) => res.json(await new Doctor(req.body).save()));
app.delete('/api/doctors/:id', async (req, res) => {
  await Doctor.deleteOne({ _id: req.params.id });
  res.json({ success:true });
});

// Appointments
app.get('/api/appointments',    async (req, res) => res.json(await Appointment.find().populate('doctorId')));

// Fixed appointments POST route:
app.post('/api/appointments', async (req, res) => {
  const { patientName, patientEmail, doctorId, time } = req.body;

  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    return res.status(400).json({ success: false, message: 'Invalid doctorId' });
  }

  const appt = new Appointment({
    patientName,
    patientEmail,
    doctorId,
    time: new Date(time)
  });

  try {
    const saved = await appt.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  await Appointment.deleteOne({ _id: req.params.id });
  res.json({ success:true });
});

// Staff
app.get('/api/staff',     async (req, res) => res.json(await Staff.find()));
app.post('/api/staff',    async (req, res) => res.json(await new Staff(req.body).save()));
app.delete('/api/staff/:id', async (req, res) => {
  await Staff.deleteOne({ _id: req.params.id });
  res.json({ success:true });
});

// Emergencies
app.get('/api/emergencies',    async (req, res) => res.json(await Emergency.find()));
app.post('/api/emergencies',   async (req, res) => res.json(await new Emergency(req.body).save()));
app.delete('/api/emergencies/:id', async (req, res) => {
  await Emergency.deleteOne({ _id: req.params.id });
  res.json({ success:true });
});

// 6) Serve your static UI
// app.use(express.static(path.join(__dirname)));
app.use('/', express.static(path.join(__dirname)));

app.listen(PORT, ()=>console.log(`Server running on http://localhost:${PORT}`));
