import express from 'express';
import {
  listAttendance,
  createAttendance,
  getAttendance,
  deleteAttendanceHandler,
  getRecentAttendance
} from '../controllers/attendanceController.js';

const router = express.Router();

router.get('/', listAttendance);
router.post('/mark', createAttendance);
router.get('/recent', getRecentAttendance);
router.get('/:id', getAttendance);
router.delete('/:id', deleteAttendanceHandler);

export default router;
