import { logger, tokenRequired } from '../../lib/utils';
import { join } from 'path';
import { tmpdir } from 'os';
import formidable from 'formidable';
import { createReadStream } from 'fs';
import { unzip } from 'unzipper';
import { copyFileSync, existsSync } from 'fs';

export default async function handler(req, res) {
  await tokenRequired(['admin'])(req, res);
  if (res.statusCode !== 200) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err || !files.file || !files.file[0].originalFilename.endsWith('.zip')) {
      logger.error('Invalid or missing ZIP file');
      return res.status(400).json({ error: 'Invalid or missing ZIP file' });
    }

    const file = files.file[0];
    const tempDir = tmpdir();
    const zipPath = join(tempDir, 'restore_temp.zip');
    const newFilePath = file.filepath || file.path; // Tùy phiên bản formidable
    await new Promise((resolve, reject) => {
      createReadStream(newFilePath)
        .pipe(createWriteStream(zipPath))
        .on('finish', resolve)
        .on('error', reject);
    });

    const extractDir = join(tempDir, 'extracted');
    await new Promise((resolve, reject) => {
      createReadStream(zipPath)
        .pipe(unzip.Extract({ path: extractDir }))
        .on('close', resolve)
        .on('error', reject);
    });

    const databases = ['mappings.db', 'sync_logs.db', 'users.db', 'config.db'];
    const restored = [];
    databases.forEach(db => {
      const src = join(extractDir, db);
      if (existsSync(src)) {
        copyFileSync(src, db);
        restored.push(db);
      }
    });

    if (!restored.length) {
      logger.error('No database files found in ZIP');
      return res.status(400).json({ error: 'No database files found in ZIP' });
    }

    logger.info(`Restored: ${restored.join(', ')}`);
    res.status(200).json({ message: `Restored: ${restored.join(', ')}` });
  });
}

export const config = { api: { bodyParser: false } };