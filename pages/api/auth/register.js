import prisma from '../../../lib/prisma';
import { logger, tokenRequired } from '../../../lib/utils';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
  await tokenRequired(['admin'])(req, res);
  if (res.statusCode !== 200) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password, role = 'viewer' } = req.body;
  if (!username || !password || !['admin', 'editor', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await prisma.user.create({ data: { username, password: hashedPassword, role } });
    logger.info(`User ${username} registered`);
    res.status(200).json({ message: 'User registered successfully' });
  } catch (e) {
    logger.error(`Username ${username} already exists`);
    res.status(400).json({ error: 'Username already exists' });
  }
}