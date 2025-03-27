import schedule from 'node-schedule';
import prisma from 'lib/prisma'; // Sử dụng đường dẫn tuyệt đối
import fetch from 'node-fetch';
import logger from './logger';

export async function startAutoSync() {
  const config = await prisma.config.findFirst();
  if (!config || !config.sync_interval) {
    logger.warn('Auto-sync not started: No sync interval configured');
    return;
  }

  const syncInterval = config.sync_interval; // minutes
  logger.info(`Starting auto-sync every ${syncInterval} minutes`);

  schedule.scheduleJob(`*/${syncInterval} * * * *`, async () => {
    logger.info('Running scheduled sync...');
    try {
      const mappings = await prisma.mapping.findMany();
      for (const mapping of mappings) {
        const response = await fetch('/api/sync/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopify_id: mapping.shopifyId,
            nhanhvn_id: mapping.nhanhvnId,
          }),
        });
        const result = await response.json();
        logger.info(`Sync result for Shopify ID ${mapping.shopifyId}: ${result.message}`);
      }
    } catch (error) {
      logger.error('Scheduled sync failed:', error);
    }
  });
}