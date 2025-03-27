import fetch from 'node-fetch';
import prisma from '../../../lib/prisma';
import { logger } from '../../../lib/utils';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { page = 1, limit = 10, filter = 'all' } = req.query;
  const mappings = await prisma.productMapping.findMany();
  const mappedIds = new Set(mappings.map(m => m.shopifyId));

  let products = [];
  let url = `https://${process.env.SHOPIFY_STORE}.myshopify.com/admin/api/2024-01/products.json?fields=id,title,variants&limit=250`;
  while (url) {
    const response = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN }
    });
    const data = await response.json();
    products.push(...data.products);
    url = response.headers.get('Link')?.match(/<([^>]+)>; rel="next"/)?.[1];
  }

  const shopifyProducts = products.flatMap(product =>
    product.variants.map(variant => ({
      id: variant.id,
      name: variant.title === 'Default Title' ? product.title : `${product.title} - ${variant.title}`,
      sku: variant.sku || 'No SKU',
      shopify_inventory_item_id: variant.inventory_item_id
    }))
  );

  const filteredProducts = shopifyProducts.filter(p => {
    const mapped = mappedIds.has(String(p.id));
    return filter === 'all' || (filter === 'mapped' && mapped) || (filter === 'unmapped' && !mapped);
  });

  const total = filteredProducts.length;
  const start = (page - 1) * limit;
  const paginated = filteredProducts.slice(start, start + +limit);

  res.status(200).json({
    products: paginated,
    pagination: {
      current_page: +page,
      total_pages: Math.ceil(total / limit),
      total_products: total,
      limit: +limit
    }
  });
}