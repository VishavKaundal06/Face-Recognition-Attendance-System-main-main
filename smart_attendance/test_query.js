require('dotenv').config({ path: 'backend/.env' });
const mongoose = require('mongoose');
const Student = require('./backend/models/Student');

async function test() {
    try {
        await mongoose.connect('mongodb://localhost:27017/smart_attendance');
        console.log("Connected");
        const students = await Student.find({
            isActive: true,
            faceDescriptor: { $exists: true, $ne: [] }
        }).select('name rollNumber email +faceDescriptor');
        
        console.log("Found students:", students.length);
        if (students.length > 0) {
            console.log("Descriptor missing?", students[0].faceDescriptor === undefined);
            if (students[0].faceDescriptor) {
                console.log("Face Descriptor keys:", Object.keys(students[0].toJSON()));
                console.log("Raw object keys:", Object.keys(students[0].toObject()));
            }
        }
    } catch(err) {
        console.error("Error:", err);
    } finally {
        process.exit(0);
    }
}
test();
