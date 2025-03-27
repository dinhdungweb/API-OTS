import prisma from '../../../lib/prisma';
import { logger, tokenRequired } from '../../../lib/utils';

export default async function handler(req, res) {
  await tokenRequired(['admin'])(req, res);
  if (res.statusCode !== 200) return;

  if (req.method === 'GET') {
    const config = await prisma.config.findUnique({ where: { id: 1 } });
    res.status(200).json(config || { nhanhApiKey: '', shopifyAccessToken: '', syncInterval: 1 });
  } else if (req.method === 'POST') {
    const { nhanh_api_key, shopify_access_token, sync_interval } = req.body;
    if (!nhanh_api_key || !shopify_access_token || sync_interval == null) {
      return res.status(400).json({ error: 'Missing config fields' });
    }
    await prisma.config.upsert({
      where: { id: 1 },
      update: { nhanhApiKey: nhanh_api_key, shopifyAccessToken: shopify_access_token, syncInterval: sync_interval },
      create: { id: 1, nhanhApiKey: nhanh_api_key, shopifyAccessToken: shopify_access_token, syncInterval: sync_interval }
    });
    logger.info('Config updated');
    res.status(200).json({ message: 'Config updated' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}