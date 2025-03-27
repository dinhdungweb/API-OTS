import fetch from 'node-fetch';
import { getConfig } from './utils';

export async function checkShopifyApiStatus() {
  const config = await getConfig();
  const { shopify_access_token } = config;
  if (!shopify_access_token) return 'offline';

  try {
    const response = await fetch('https://your-shopify-store.myshopify.com/admin/api/2023-10/shop.json', {
      headers: {
        'X-Shopify-Access-Token': shopify_access_token,
      },
    });
    return response.ok ? 'online' : 'offline';
  } catch (error) {
    console.error('Error checking Shopify API status:', error);
    return 'offline';
  }
}

export async function getShopifyProducts(page = 1, limit = 50, filter = 'all') {
  const config = await getConfig();
  const { shopify_access_token } = config;
  if (!shopify_access_token) throw new Error('Shopify access token not configured');

  try {
    const response = await fetch(
      `https://your-shopify-store.myshopify.com/admin/api/2023-10/products.json?page=${page}&limit=${limit}`,
      {
        headers: {
          'X-Shopify-Access-Token': shopify_access_token,
        },
      }
    );
    const data = await response.json();
    const products = data.products.map((product) => ({
      id: product.id,
      name: product.title,
      sku: product.variants[0]?.sku || '',
      shopify_inventory_item_id: product.variants[0]?.inventory_item_id || '',
    }));

    // Lọc sản phẩm theo filter
    const totalProducts = products.length; // Giả lập, cần API Shopify hỗ trợ pagination
    let filteredProducts = products;
    if (filter === 'mapped' || filter === 'unmapped') {
      const mappingsResponse = await fetch('/api/products/mappings');
      const mappings = await mappingsResponse.json();
      filteredProducts = products.filter((product) =>
        filter === 'mapped' ? mappings[product.id] : !mappings[product.id]
      );
    }

    return {
      products: filteredProducts,
      pagination: {
        total_pages: Math.ceil(totalProducts / limit),
        total_products: totalProducts,
      },
    };
  } catch (error) {
    console.error('Error fetching Shopify products:', error);
    throw new Error('Failed to fetch Shopify products');
  }
}

export async function syncShopifyInventory(shopify_inventory_id, quantity) {
  const config = await getConfig();
  const { shopify_access_token } = config;
  if (!shopify_access_token) throw new Error('Shopify access token not configured');

  try {
    const response = await fetch(
      `https://your-shopify-store.myshopify.com/admin/api/2023-10/inventory_levels/set.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': shopify_access_token,
        },
        body: JSON.stringify({
          inventory_item_id: shopify_inventory_id,
          location_id: 'your-location-id', // Cần thay bằng location_id thực tế
          available: quantity,
        }),
      }
    );
    if (!response.ok) throw new Error('Failed to sync Shopify inventory');
    return { message: 'Synced Shopify inventory successfully' };
  } catch (error) {
    console.error('Error syncing Shopify inventory:', error);
    throw new Error('Failed to sync Shopify inventory');
  }
}