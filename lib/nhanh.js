import fetch from 'node-fetch';
import { getConfig } from './utils';

export async function checkNhanhApiStatus() {
  const config = await getConfig();
  const { nhanh_api_key } = config;
  if (!nhanh_api_key) return 'offline';

  try {
    const response = await fetch('https://api.nhanh.vn/v1/status', {
      headers: { Authorization: `Bearer ${nhanh_api_key}` },
    });
    return response.ok ? 'online' : 'offline';
  } catch (error) {
    console.error('Error checking Nhanh.vn API status:', error);
    return 'offline';
  }
}

export async function searchNhanhProduct(query) {
  const config = await getConfig();
  const { nhanh_api_key } = config;
  if (!nhanh_api_key) throw new Error('Nhanh.vn API key not configured');

  try {
    const response = await fetch('https://api.nhanh.vn/v1/products/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nhanh_api_key}`,
      },
      body: JSON.stringify({ query }),
    });
    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error('Error searching Nhanh.vn products:', error);
    throw new Error('Failed to search Nhanh.vn products');
  }
}

export async function getNhanhInventory(nhanhvn_id) {
  const config = await getConfig();
  const { nhanh_api_key } = config;
  if (!nhanh_api_key) throw new Error('Nhanh.vn API key not configured');

  try {
    const response = await fetch(`https://api.nhanh.vn/v1/inventory/${nhanhvn_id}`, {
      headers: { Authorization: `Bearer ${nhanh_api_key}` },
    });
    const data = await response.json();
    return {
      total_remain: data.total_remain || 0,
      depots: data.depots || {},
    };
  } catch (error) {
    console.error('Error fetching Nhanh.vn inventory:', error);
    throw new Error('Failed to fetch Nhanh.vn inventory');
  }
}