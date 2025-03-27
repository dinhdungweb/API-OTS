import { startAutoSync } from '../../lib/sync';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      await startAutoSync();
      res.status(200).json({ message: 'Auto-sync started successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to start auto-sync', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}