import prisma from '../../../lib/prisma';
import redis from '../../../lib/redis';
import { logger, tokenRequired } from '../../../lib/utils';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  await tokenRequired(['admin', 'editor'])(req, res);
  if (res.statusCode !== 200) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { shopify_id, nhanhvn_id, shopify_inventory_id } = req.body;
  if (!shopify_id || !nhanhvn_id || !shopify_inventory_id) {
    logger.error('Missing required fields');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const cacheKey = `inventory:${nhanhvn_id}`;
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    const { total_remain } = JSON.parse(cachedData);
    return await updateShopify(shopify_id, nhanhvn_id, shopify_inventory_id, total_remain, res);
  }

  const response = await fetch('https://open.nhanh.vn/api/product/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      version: '2.0',
      appId: process.env.NHANH_APP_ID,
      businessId: process.env.NHANH_BUSINESS_ID,
      accessToken: process.env.NHANH_API_KEY,
      data: JSON.stringify({ id: nhanhvn_id })
    })
  });
  const nhanhData = await response.json();

  if (nhanhData.code !== 1 || !nhanhData.data) {
    await logSync(shopify_id, nhanhvn_id, 'error', 'Failed to fetch Nhanh.vn data');
    return res.status(500).json({ error: 'Failed to fetch Nhanh.vn data' });
  }

  let total_remain = 0;
  const inventory = nhanhData.data.products?.[nhanhvn_id]?.inventory || nhanhData.data.inventory || {};
  total_remain = parseInt(inventory.remain || inventory.depots?.['175080']?.available || inventory.quantity || 0);

  await redis.setEx(cacheKey, 300, JSON.stringify({ total_remain }));
  await updateShopify(shopify_id, nhanhvn_id, shopify_inventory_id, total_remain, res);
}

async function updateShopify(shopify_id, nhanhvn_id, shopify_inventory_id, total_remain, res) {
  const response = await fetch(`https://${process.env.SHOPIFY_STORE}.myshopify.com/admin/api/2024-01/inventory_levels/set.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      location_id: process.env.SHOPIFY_LOCATION_ID,
      inventory_item_id: shopify_inventory_id,
      available: total_remain
    })
  });

  if (response.ok) {
    await logSync(shopify_id, nhanhvn_id, 'success', `Updated ${total_remain} items`);
    res.status(200).json({ message: `Updated ${total_remain} items on Shopify` });
  } else {
    await logSync(shopify_id, nhanhvn_id, 'error', 'Shopify update failed');
    res.status(500).json({ error: 'Shopify update failed' });
  }
}

async function logSync(shopifyId, nhanhvnId, status, message) {
  await prisma.syncLog.create({ data: { shopifyId, nhanhvnId, status, message } });
}