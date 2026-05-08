import Attendance from '../models/attendance.js';
import Student from '../models/user.js';

export async function listAttendance(req, res) {
  try {
    const records = await Attendance.find(req.query).sort({ timeIn: -1 });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createAttendance(req, res) {
  try {
    const { studentId, status, confidence, photo, deviceInfo, location } = req.body;
    if (!studentId || !status) {
      return res.status(400).json({ success: false, error: 'Student ID and status are required' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const today = new Date().setHours(0, 0, 0, 0);
    const existingRecord = await Attendance.findOne({ studentId, date: today });

    if (existingRecord) {
      return res.status(409).json({ success: false, error: 'Attendance already marked for today' });
    }

    const newRecord = new Attendance({
      studentId,
      studentName: student.name,
      rollNumber: student.rollNumber,
      status,
      confidence,
      photo,
      deviceInfo,
      location
    });

    await newRecord.save();
    res.status(201).json({ success: true, data: newRecord });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getAttendance(req, res) {
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Attendance record not found' });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteAttendanceHandler(req, res) {
  try {
    const deleted = await Attendance.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Attendance record not found' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getRecentAttendance(req, res) {
  try {
    const { date, rollNumber, limit = 30 } = req.query;
    const query = {};
    if (date) query.date = new Date(date);
    if (rollNumber) query.rollNumber = { $regex: new RegExp(rollNumber, 'i') };

    const records = await Attendance.find(query)
      .sort({ timeIn: -1 })
      .limit(parseInt(limit, 10));
      
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
