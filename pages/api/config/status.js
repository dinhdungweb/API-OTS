import fetch from 'node-fetch';
import { logger, tokenRequired } from '../../../lib/utils';

export default async function handler(req, res) {
  await tokenRequired(['admin'])(req, res);
  if (res.statusCode !== 200) return;

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  let nhanhStatus = 'offline';
  let shopifyStatus = 'offline';

  try {
    const nhanhRes = await fetch('https://open.nhanh.vn/api/product/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        version: '2.0',
        appId: process.env.NHANH_APP_ID,
        businessId: process.env.NHANH_BUSINESS_ID,
        accessToken: process.env.NHANH_API_KEY,
        data: JSON.stringify({ page: 1, icpp: 1 })
      }),
      timeout: 5000
    });
    if (nhanhRes.ok && (await nhanhRes.json()).code === 1) nhanhStatus = 'online';
  } catch (e) {
    logger.error(`Nhanh.vn API check failed: ${e}`);
  }

  try {
    const shopifyRes = await fetch(`https://${process.env.SHOPIFY_STORE}.myshopify.com/admin/api/2024-01/products.json?limit=1`, {
      headers: { 'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN },
      timeout: 5000
    });
    if (shopifyRes.ok) shopifyStatus = 'online';
  } catch (e) {
    logger.error(`Shopify API check failed: ${e}`);
  }

  res.status(200).json({ nhanhvn: nhanhStatus, shopify: shopifyStatus });
}