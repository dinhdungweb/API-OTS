import prisma from '../../lib/prisma';
import { logger } from '../../lib/utils';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const logs = await prisma.syncLog.groupBy({
    by: ['timestamp'],
    _count: { status: true },
    where: { timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    orderBy: { timestamp: 'desc' }
  });

  const result = {};
  logs.forEach(log => {
    const date = log.timestamp.toISOString().split('T')[0];
    result[date] = {
      success: log._count.status === 'success' ? log._count._all : 0,
      error: log._count.status === 'error' ? log._count._all : 0
    };
  });

  res.status(200).json(result);
}