// server/routes/logs.js
const express = require('express');
const { Log } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Require Admin authorization for logs
router.use(requireAdmin);

// Get audit logs
router.get('/', async (req, res) => {
  try {
    const logs = await Log.findAll({
      order: [['id', 'DESC']],
      limit: 100,
    });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถโหลดประวัติ Log ได้' });
  }
});

// Clear logs (Admin)
router.delete('/', async (req, res) => {
  try {
    await Log.destroy({ where: {}, truncate: true });
    res.json({ message: 'ล้างประวัติ Log ทั้งหมดเรียบร้อย' });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถล้าง Log ได้' });
  }
});

module.exports = router;
