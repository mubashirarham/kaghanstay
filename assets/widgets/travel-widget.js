/**
 * KPH Stay Interactive Mountain Travel & Distance Widget
 * Embeddable on external travel blogs, tourism guides, and hotel review sites.
 * Provides live driving distances, mountain elevations, and weather recommendations.
 */
(function() {
    'use strict';

    function initWidget() {
        const container = document.getElementById('kph-travel-widget');
        if (!container) return;

        const widgetHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 20px auto; background: #0F172A; color: #FFFFFF; border-radius: 20px; padding: 24px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); border: 1px solid rgba(212, 175, 55, 0.3); text-align: left;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="background: #C5A059; color: #0F172A; font-weight: 900; font-size: 11px; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">KPH</span>
                    <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #F8FAFC;">Mountain Travel & Distance Guide</h4>
                </div>
                <span style="font-size: 10px; color: #94A3B8; text-transform: uppercase; font-weight: 600;">Pakistan 2026</span>
            </div>

            <div style="margin-bottom: 14px;">
                <label style="display: block; font-size: 11px; font-weight: 700; color: #CBD5E1; text-transform: uppercase; margin-bottom: 6px;">Select Destination:</label>
                <select id="kph-dest-select" style="width: 100%; padding: 10px 12px; background: #1E293B; color: #FFFFFF; border: 1px solid #334155; border-radius: 10px; font-size: 13px; outline: none; cursor: pointer;">
                    <option value="murree">Murree Hills (7,500 ft) - 55 km from ISB</option>
                    <option value="nathiagali">Nathia Gali (8,200 ft) - 85 km from ISB</option>
                    <option value="bahria">Bahria Enclave Islamabad - 15 km from ISB Airport</option>
                </select>
            </div>

            <div id="kph-dest-info" style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 14px; margin-bottom: 16px; font-size: 12px; line-height: 1.6; color: #E2E8F0;">
                <div>🚗 <strong>Drive Time:</strong> ~50 to 60 mins via Murree Expressway (N-75)</div>
                <div>❄️ <strong>Winter Weather:</strong> -5°C to 8°C (Snowfall Dec-Feb)</div>
                <div>🏡 <strong>Recommended Accommodation:</strong> Heated Private Chalets & Suites</div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #94A3B8; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 12px;">
                <span>Verified Travel Data</span>
                <span>Powered by <a href="https://kphstay.com/" target="_blank" rel="dofollow" style="color: #C5A059; text-decoration: none; font-weight: 800;">KPH Stay Luxury Chalets</a></span>
            </div>
        </div>
        `;

        container.innerHTML = widgetHtml;

        const select = document.getElementById('kph-dest-select');
        const info = document.getElementById('kph-dest-info');

        const destinations = {
            murree: {
                drive: '~50 to 60 mins via Murree Expressway (N-75)',
                weather: '-5°C to 8°C (Snowfall Dec-Feb)',
                stay: 'Heated Chalets at <a href="https://kphstay.com/luxury-apartments-murree" target="_blank" rel="dofollow" style="color:#C5A059;font-weight:bold;">Tulipano by Nook House & Winds Way</a>'
            },
            nathiagali: {
                drive: '~2.5 hours via Galyat Scenic Highway',
                weather: '-7°C to 5°C (Alpine Snowline)',
                stay: 'Private Pine Forest Lodges at <a href="https://kphstay.com/vacation-rentals-nathia-gali" target="_blank" rel="dofollow" style="color:#C5A059;font-weight:bold;">KPH Stay Nathia Gali</a>'
            },
            bahria: {
                drive: '~20 mins from Blue Area / 40 mins from Airport',
                weather: 'Moderate capital climate, Margalla mountain views',
                stay: 'Executive Serviced Residences at <a href="https://kphstay.com/serviced-apartments-islamabad" target="_blank" rel="dofollow" style="color:#C5A059;font-weight:bold;">Cube Apartments Bahria Enclave</a>'
            }
        };

        if (select && info) {
            select.addEventListener('change', function() {
                const sel = destinations[this.value] || destinations.murree;
                info.innerHTML = `
                    <div>🚗 <strong>Drive Time:</strong> ${sel.drive}</div>
                    <div>❄️ <strong>Weather:</strong> ${sel.weather}</div>
                    <div>🏡 <strong>Recommended Stay:</strong> ${sel.stay}</div>
                `;
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }
})();
