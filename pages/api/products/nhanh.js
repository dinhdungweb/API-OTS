import fetch from 'node-fetch';
import { logger, tokenRequired } from '../../../lib/utils';

export default async function handler(req, res) {
  await tokenRequired(['admin', 'editor'])(req, res);
  if (res.statusCode !== 200) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const response = await fetch('https://open.nhanh.vn/api/product/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      version: '2.0',
      appId: process.env.NHANH_APP_ID,
      businessId: process.env.NHANH_BUSINESS_ID,
      accessToken: process.env.NHANH_API_KEY,
      data: JSON.stringify({ name: query, page: 1, icpp: 50 })
    })
  });
  const data = await response.json();

  if (data.code !== 1 || !data.data?.products) {
    logger.error(`No products found: ${JSON.stringify(data)}`);
    return res.status(404).json({ error: 'No products found' });
  }

  res.status(200).json({ products: Object.values(data.data.products) });
}