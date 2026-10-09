import { Router } from 'express';
import { updateGameFile } from '../services/gameBuilder.js';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Update a file in a game (from Monaco editor)
router.put('/:gameId/*', async (req, res) => {
  const { gameId } = req.params;
  const filePath = req.params[0];
  const { content } = req.body;
  if (!content && content !== '') return res.status(400).json({ error: 'content required' });
  try {
    await updateGameFile(gameId, filePath, content);
    res.json({ success: true, message: `Saved ${filePath}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload an image for vision analysis
router.post('/upload-image', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const base64 = req.file.buffer.toString('base64');
  res.json({ base64, mimetype: req.file.mimetype });
});

export default router;
