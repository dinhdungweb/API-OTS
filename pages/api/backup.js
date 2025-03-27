import { logger, tokenRequired } from '../../lib/utils';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import archiver from 'archiver';

export default async function handler(req, res) {
  await tokenRequired(['admin'])(req, res);
  if (res.statusCode !== 200) return;

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const databases = ['mappings.db', 'sync_logs.db', 'users.db', 'config.db'];
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
  const zipPath = join(tmpdir(), `backup_${timestamp}.zip`);
  const archive = archiver('zip', { zlib: { level: 9 } });
  const output = createWriteStream(zipPath);

  archive.on('error', err => {
    logger.error(`Backup failed: ${err}`);
    res.status(500).json({ error: 'Backup failed', details: err.message });
  });

  output.on('close', () => {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=backup_${timestamp}.zip`);
    res.sendFile(zipPath, err => {
      if (err) logger.error(`Send file failed: ${err}`);
      else logger.info('Backup sent successfully');
    });
  });

  archive.pipe(output);
  databases.forEach(db => archive.file(db, { name: db }));
  await archive.finalize();
}

export const config = { api: { responseLimit: false } };