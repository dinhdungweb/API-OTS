import prisma from '../../../lib/prisma';
import { logger, tokenRequired } from '../../../lib/utils';

export default async function handler(req, res) {
  await tokenRequired(['admin'])(req, res);
  if (res.statusCode !== 200) return;

  if (req.method === 'GET') {
    const users = await prisma.user.findMany({ select: { id: true, username: true, role: true } });
    res.status(200).json(users);
  } else if (req.method === 'PUT') {
    const { id, role } = req.body;
    if (!id || !['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    await prisma.user.update({ where: { id }, data: { role } });
    logger.info(`Updated role for user ${id}`);
    res.status(200).json({ message: 'Role updated' });
  } else if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    await prisma.user.delete({ where: { id } });
    logger.info(`Deleted user ${id}`);
    res.status(200).json({ message: 'User deleted' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}