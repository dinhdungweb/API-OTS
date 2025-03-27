import fetch from 'node-fetch';
import prisma from '../../../lib/prisma';
import { logger } from '../../../lib/utils';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { filter = 'all' } = req.query;
  const mappings = await prisma.productMapping.findMany();
  const mappedIds = new Set(mappings.map(m => m.shopifyId));

  let products = [];
  let url = `https://${process.env.SHOPIFY_STORE}.myshopify.com/admin/api/2024-01/products.json?fields=id,variants&limit=250`;
  while (url) {
    const response = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN }
    });
    const data = await response.json();
    products.push(...data.products);
    url = response.headers.get('Link')?.match(/<([^>]+)>; rel="next"/)?.[1];
  }

  const shopifyProducts = products.flatMap(p => p.variants.map(v => ({ id: v.id })));
  const filtered = shopifyProducts.filter(p => {
    const mapped = mappedIds.has(String(p.id));
    return filter === 'all' || (filter === 'mapped' && mapped) || (filter === 'unmapped' && !mapped);
  });

  const total = filtered.length;
  const mappedCount = filtered.filter(p => mappedIds.has(String(p.id))).length;

  res.status(200).json({
    total_products: total,
    mapped_count: mappedCount,
    unmapped_count: total - mappedCount
  });
}