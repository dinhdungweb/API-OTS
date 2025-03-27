import prisma from '../../../lib/prisma';
import { logger, tokenRequired } from '../../../lib/utils';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mappings = await prisma.productMapping.findMany();
    const result = mappings.reduce((acc, { shopifyId, nhanhvnId, nhanhvnName }) => {
      acc[shopifyId] = { idNhanh: nhanhvnId, name: nhanhvnName };
      return acc;
    }, {});
    res.status(200).json(result);
  } else if (req.method === 'POST') {
    await tokenRequired(['admin', 'editor'])(req, res);
    if (res.statusCode !== 200) return;

    const { mappings } = req.body;
    if (!mappings) return res.status(400).json({ error: 'Missing mappings' });

    await prisma.$transaction(
      Object.entries(mappings).map(([shopifyId, { idNhanh, name }]) =>
        prisma.productMapping.upsert({
          where: { shopifyId },
          update: { nhanhvnId: idNhanh, nhanhvnName: name },
          create: { shopifyId, nhanhvnId: idNhanh, nhanhvnName: name }
        })
      )
    );
    logger.info('Mappings saved');
    res.status(200).json({ message: 'Mappings saved' });
  } else if (req.method === 'DELETE') {
    await tokenRequired(['admin', 'editor'])(req, res);
    if (res.statusCode !== 200) return;

    const { shopify_id } = req.body;
    if (!shopify_id) return res.status(400).json({ error: 'Missing shopify_id' });

    await prisma.productMapping.delete({ where: { shopifyId: shopify_id } });
    logger.info(`Unmapped shopify_id: ${shopify_id}`);
    res.status(200).json({ message: 'Mapping removed' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}