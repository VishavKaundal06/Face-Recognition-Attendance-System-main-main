require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Student = require('./models/Student');

async function run() {
  await connectDB();
  const students = await Student.find({ isActive: true, faceDescriptor: { $exists: true, $ne: [] } }).select('+faceDescriptor');
  console.log('Students found:', students.length);
  if (students.length > 0) {
    console.log('Descriptor missing?', students[0].faceDescriptor === undefined);
    if (students[0].faceDescriptor) {
      console.log('Descriptor length:', students[0].faceDescriptor.length);
      console.log('JSON object keys:', Object.keys(students[0].toJSON()));
    }
  }
  process.exit();
}
run();
