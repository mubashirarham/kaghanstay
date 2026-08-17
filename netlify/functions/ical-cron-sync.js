// Netlify Scheduled Function: Automated 5-Minute Airbnb Calendar Synchronization Cron
// Executes periodically in the background to keep all listings synchronized with Airbnb & OTAs.

const { schedule } = require('@netlify/functions');
const { syncRoomsCore } = require('./ical-sync');

// Run every 5 minutes: '*/5 * * * *'
exports.handler = schedule('*/5 * * * *', async (event) => {
    console.log('[iCal Cron] Starting automated 5-minute Airbnb calendar synchronization...');
    const startTime = Date.now();

    try {
        const result = await syncRoomsCore({ all: true });
        const elapsedMs = Date.now() - startTime;
        console.log(`[iCal Cron] Synced successfully in ${elapsedMs}ms:`, JSON.stringify(result));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Automated 5-minute Airbnb calendar sync completed successfully',
                elapsedMs,
                result
            })
        };
    } catch (err) {
        console.error('[iCal Cron] Error during scheduled sync:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: `Cron synchronization error: ${err.message}`
            })
        };
    }
});
