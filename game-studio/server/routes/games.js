import { Router } from 'express';
import { listGames, getGameFiles, deleteGame } from '../services/gameBuilder.js';

const router = Router();

// List all games
router.get('/', async (req, res) => {
  try {
    const games = await listGames();
    res.json({ games });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific game metadata + files
router.get('/:gameId', async (req, res) => {
  try {
    const data = await getGameFiles(req.params.gameId);
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Delete a game
router.delete('/:gameId', async (req, res) => {
  try {
    await deleteGame(req.params.gameId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
