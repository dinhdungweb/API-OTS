import prisma from '../../../lib/prisma';
import { logger, tokenRequired } from '../../../lib/utils';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const logs = await prisma.syncLog.findMany({ orderBy: { timestamp: 'desc' } });
    res.status(200).json(logs.map(log => ({
      shopifyId: log.shopifyId,
      nhanhvnId: log.nhanhvnId,
      timestamp: log.timestamp,
      status: log.status,
      message: log.message
    })));
  } else if (req.method === 'POST') {
    await tokenRequired(['admin'])(req, res);
    if (res.statusCode !== 200) return;

    const { shopify_id } = req.body;
    if (!shopify_id) return res.status(400).json({ error: 'Missing shopify_id' });

    await prisma.syncLog.deleteMany({ where: { shopifyId: shopify_id } });
    logger.info(`Deleted logs for shopify_id: ${shopify_id}`);
    res.status(200).json({ message: 'Logs deleted' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}