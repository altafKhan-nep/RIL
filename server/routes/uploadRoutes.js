const fs = require('fs');
const path = require('path');
const multer = require('multer');
const express = require('express');
const { protect, requirePermission } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const allowed = /jpeg|jpg|png|gif|webp|avif/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, png, gif, webp, avif) are allowed'));
  }
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/', protect, requirePermission('products:edit'), upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No image file provided');
  }
  res.json({ url: `/uploads/${req.file.filename}` });
}));

router.post('/multiple', protect, requirePermission('products:edit'), upload.array('images', 10), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error('No image files provided');
  }
  const urls = req.files.map((f) => `/uploads/${f.filename}`);
  res.json({ urls });
}));

module.exports = router;
