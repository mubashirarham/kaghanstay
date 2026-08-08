// Kaghan Hotel - Admin Room Inventory Module
(function() {
    let allInventoryRooms = [];
    let inventoryFiltersBound = false;
    let activeEditRoomId = null;
    let editRoomMap = null;
    let editRoomMarker = null;
    let addRoomMap = null;
    let addRoomMarker = null;

    let addMapTileLayer = null;
    let editMapTileLayer = null;

    const GOOGLE_MAPS_TILES = {
        roadmap: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        satellite: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}' // Google Hybrid Satellite
    };

    // Curated Popular Locations, Resorts, Malls, Shops & Attractions Database
    const POPULAR_LOCATIONS = [
        // Resorts & Luxury Apartments
        { title: "KPH Stay Luxury Apartments & Resort", category: "resort", city: "Islamabad", lat: 33.6844, lng: 73.2045, address: "Asian Arcade, Sector C, Bahria Enclave, Islamabad" },
        { title: "KPH Stay Nathia Gali Resort", category: "resort", city: "Nathia Gali", lat: 34.0722, lng: 73.3831, address: "Main Resort Road, Nathia Gali, Abbottabad" },
        { title: "Serena Hotel Islamabad", category: "resort", city: "Islamabad", lat: 33.7225, lng: 73.0968, address: "Khayaban-e-Suhrawardy, G-5, Islamabad" },
        { title: "Marriott Hotel Islamabad", category: "resort", city: "Islamabad", lat: 33.7212, lng: 73.0822, address: "Aga Khan Road, G-5/1, Islamabad" },
        { title: "Pearl Continental Hotel Bhurban", category: "resort", city: "Murree", lat: 33.9555, lng: 73.4510, address: "Bhurban, Murree, Punjab" },
        { title: "Monal Restaurant & Resort", category: "resort", city: "Islamabad", lat: 33.7431, lng: 73.0645, address: "Pir Sohawa, Margalla Hills, Islamabad" },
        { title: "La Montana Restaurant & Resort", category: "resort", city: "Islamabad", lat: 33.7420, lng: 73.0640, address: "Margalla Hills, Islamabad" },
        { title: "Pine Park Hotel & Resort", category: "resort", city: "Kaghan", lat: 34.7733, lng: 73.5280, address: "Kaghan Valley, Mansehra, KP" },
        { title: "Arcadian Riverside Resort", category: "resort", city: "Naran", lat: 34.9089, lng: 73.6508, address: "River Kunhar Bank, Naran, Kaghan Valley" },
        { title: "Alpine Hotel & Resort", category: "resort", city: "Nathia Gali", lat: 34.0750, lng: 73.3850, address: "Pine Road, Nathia Gali" },

        // Malls & Shopping Centers
        { title: "Centaurus Mall & Residences", category: "mall", city: "Islamabad", lat: 33.7077, lng: 73.0501, address: "Jinnah Avenue, F-8, Islamabad" },
        { title: "Giga Mall & World Trade Center", category: "mall", city: "Islamabad", lat: 33.5244, lng: 73.1678, address: "Main GT Road, DHA Phase 2, Islamabad" },
        { title: "Safa Gold Mall", category: "mall", city: "Islamabad", lat: 33.7215, lng: 73.0567, address: "F-7 Markaz, Islamabad" },
        { title: "Amazon Mall", category: "mall", city: "Islamabad", lat: 33.5350, lng: 73.1590, address: "GT Road, Islamabad" },
        { title: "Gulberg Galleria Mall", category: "mall", city: "Islamabad", lat: 33.5930, lng: 73.1550, address: "Gulberg Greens, Islamabad" },
        { title: "Asian Arcade & Shopping Hub", category: "mall", city: "Islamabad", lat: 33.6844, lng: 73.2045, address: "Sector C Commercial, Bahria Enclave, Islamabad" },

        // Markets, Shops & Commercial Markaz
        { title: "F-6 Markaz (Super Market)", category: "shop", city: "Islamabad", lat: 33.7294, lng: 73.0768, address: "Sector F-6 Markaz, Islamabad" },
        { title: "F-7 Markaz (Jinnah Super Market)", category: "shop", city: "Islamabad", lat: 33.7215, lng: 73.0567, address: "Sector F-7 Markaz, Islamabad" },
        { title: "F-8 Markaz", category: "shop", city: "Islamabad", lat: 33.7050, lng: 73.0380, address: "Sector F-8 Markaz, Islamabad" },
        { title: "F-10 Markaz", category: "shop", city: "Islamabad", lat: 33.6922, lng: 73.0166, address: "Sector F-10 Markaz, Islamabad" },
        { title: "F-11 Markaz", category: "shop", city: "Islamabad", lat: 33.6841, lng: 72.9885, address: "Sector F-11 Markaz, Islamabad" },
        { title: "G-9 Markaz (Karachi Company)", category: "shop", city: "Islamabad", lat: 33.6930, lng: 73.0300, address: "Sector G-9 Markaz, Islamabad" },
        { title: "I-8 Markaz", category: "shop", city: "Islamabad", lat: 33.6680, lng: 73.0750, address: "Sector I-8 Markaz, Islamabad" },
        { title: "Blue Area Commercial Hub", category: "shop", city: "Islamabad", lat: 33.7128, lng: 73.0607, address: "Jinnah Avenue, Blue Area, Islamabad" },
        { title: "Commercial Market Satellite Town", category: "shop", city: "Rawalpindi", lat: 33.6360, lng: 73.0700, address: "Commercial Market, Rawalpindi" },
        { title: "Mall Road Shopping Bazaar", category: "shop", city: "Murree", lat: 33.9070, lng: 73.3943, address: "Mall Road, Murree" },
        { title: "Naran Main Shopping Bazaar", category: "shop", city: "Naran", lat: 34.9089, lng: 73.6508, address: "Main Bazaar, Naran, Kaghan" },

        // Areas & Housing Societies
        { title: "Bahria Enclave, Sector C", category: "area", city: "Islamabad", lat: 33.6844, lng: 73.2045, address: "Sector C, Bahria Enclave, Islamabad" },
        { title: "Bahria Enclave, Main Boulevard", category: "area", city: "Islamabad", lat: 33.6890, lng: 73.1990, address: "Main Boulevard, Bahria Enclave, Islamabad" },
        { title: "Sector E-11", category: "area", city: "Islamabad", lat: 33.6990, lng: 72.9750, address: "Sector E-11, Islamabad" },
        { title: "DHA Phase 2", category: "area", city: "Islamabad", lat: 33.5280, lng: 73.1610, address: "DHA Phase 2, Islamabad" },
        { title: "Gulberg Greens", category: "area", city: "Islamabad", lat: 33.5930, lng: 73.1550, address: "Gulberg Greens Executive, Islamabad" },

        // Landmarks, Parks & Attractions
        { title: "Faisal Mosque", category: "landmark", city: "Islamabad", lat: 33.7297, lng: 73.0372, address: "Shah Faisal Avenue, Islamabad" },
        { title: "Daman-e-Koh Viewpoint", category: "landmark", city: "Islamabad", lat: 33.7380, lng: 73.0580, address: "Margalla Hills National Park, Islamabad" },
        { title: "Rawal Lake & Lake View Park", category: "landmark", city: "Islamabad", lat: 33.7020, lng: 73.1250, address: "Murree Road, Islamabad" },
        { title: "Lake Saif-ul-Malook", category: "landmark", city: "Naran", lat: 34.8770, lng: 73.6980, address: "Saif-ul-Malook National Park, Naran" },
        { title: "Babusar Top Pass", category: "landmark", city: "Kaghan Valley", lat: 35.1466, lng: 74.0478, address: "Babusar Pass, N-15 Highway, Kaghan" },
        { title: "Pipeline Walking Track", category: "landmark", city: "Nathia Gali", lat: 34.0620, lng: 73.3910, address: "Pipeline Track, Ayubia to Nathia Gali" }
    ];

    function getLocationCategoryIcon(category) {
        switch (category) {
            case 'resort':
                return '<i class="fa-solid fa-hotel text-amber-600 mt-0.5 text-sm shrink-0"></i>';
            case 'mall':
                return '<i class="fa-solid fa-bag-shopping text-purple-600 mt-0.5 text-sm shrink-0"></i>';
            case 'shop':
                return '<i class="fa-solid fa-store text-indigo-600 mt-0.5 text-sm shrink-0"></i>';
            case 'landmark':
                return '<i class="fa-solid fa-mountain-sun text-emerald-600 mt-0.5 text-sm shrink-0"></i>';
            default:
                return '<i class="fa-solid fa-location-dot text-red-500 mt-0.5 text-sm shrink-0"></i>';
        }
    }

    function initNativeAdminMap(mode, lat, lng) {
        if (!window.google || !window.google.maps) return;

        const containerId = `${mode}-room-map`;
        const container = document.getElementById(containerId);
        if (!container) return;

        const coords = { lat: parseFloat(lat), lng: parseFloat(lng) };

        let mapObj = mode === 'add' ? addRoomMap : editRoomMap;
        let markerObj = mode === 'add' ? addRoomMarker : editRoomMarker;

        if (!mapObj) {
            mapObj = new google.maps.Map(container, {
                center: coords,
                zoom: 15,
                mapTypeId: 'roadmap',
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false
            });

            markerObj = new google.maps.Marker({
                position: coords,
                map: mapObj,
                draggable: true,
                title: 'Drag pin to update exact location'
            });

            mapObj.addListener('click', (e) => {
                const clickLat = e.latLng.lat();
                const clickLng = e.latLng.lng();
                markerObj.setPosition(e.latLng);
                document.getElementById(`${mode}-room-lat`).value = clickLat;
                document.getElementById(`${mode}-room-lng`).value = clickLng;
                reverseGeocodeAdminMap(clickLat, clickLng, mode);
            });

            markerObj.addListener('dragend', (e) => {
                const dragLat = e.latLng.lat();
                const dragLng = e.latLng.lng();
                document.getElementById(`${mode}-room-lat`).value = dragLat;
                document.getElementById(`${mode}-room-lng`).value = dragLng;
                reverseGeocodeAdminMap(dragLat, dragLng, mode);
            });

            if (mode === 'add') {
                addRoomMap = mapObj;
                addRoomMarker = markerObj;
            } else {
                editRoomMap = mapObj;
                editRoomMarker = markerObj;
            }
        } else {
            mapObj.setCenter(coords);
            mapObj.setZoom(15);
            markerObj.setPosition(coords);
            google.maps.event.trigger(mapObj, 'resize');
        }
    }

    window.switchMapTileStyle = function(mode, style) {
        const mapObj = mode === 'add' ? addRoomMap : editRoomMap;
        if (!mapObj || !mapObj.setMapTypeId) return;

        const mapTypeId = style === 'satellite' ? 'hybrid' : 'roadmap';
        mapObj.setMapTypeId(mapTypeId);

        const roadmapBtn = document.getElementById(`${mode}-map-style-roadmap`);
        const satelliteBtn = document.getElementById(`${mode}-map-style-satellite`);
        if (roadmapBtn && satelliteBtn) {
            if (style === 'satellite') {
                satelliteBtn.className = 'px-2.5 py-1 rounded-lg bg-[#0B0F19] text-white transition-all shadow-sm';
                roadmapBtn.className = 'px-2.5 py-1 rounded-lg text-slate-600 hover:bg-slate-100 transition-all';
            } else {
                roadmapBtn.className = 'px-2.5 py-1 rounded-lg bg-[#0B0F19] text-white transition-all shadow-sm';
                satelliteBtn.className = 'px-2.5 py-1 rounded-lg text-slate-600 hover:bg-slate-100 transition-all';
            }
        }
    };

    window.locateCurrentPosition = function(mode) {
        if (!navigator.geolocation) {
            if (window.KaghanUI) KaghanUI.showToast('GPS is not supported by your browser', 'error');
            return;
        }

        if (window.KaghanUI) KaghanUI.showToast('Detecting your GPS position...', 'info');

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                selectLocationPrediction(lat, lng, 'My GPS Position', mode);
                if (window.KaghanUI) KaghanUI.showToast('GPS location pinned on Google Maps!', 'success');
            },
            (err) => {
                console.warn("GPS error:", err);
                if (window.KaghanUI) KaghanUI.showToast('Could not retrieve GPS coordinates. Please allow location access.', 'warning');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    async function reverseGeocodeAdminMap(lat, lng, mode) {
        if (window.KaghanMaps) {
            try {
                const geoRes = await KaghanMaps.reverseGeocode(lat, lng);
                if (geoRes && geoRes.formattedAddress) {
                    updateMapBadgeDisplay(lat, lng, geoRes.formattedAddress, mode);
                }
            } catch (err) {
                console.warn("Reverse geocode error:", err);
            }
        }
    }

    function updateMapBadgeDisplay(lat, lng, address, mode) {
        const addrInput = document.getElementById(`${mode}-room-address`);
        const detectedText = document.getElementById(`${mode}-map-detected-text`);
        const coordsBadge = document.getElementById(`${mode}-map-coords-badge`);

        if (addrInput) addrInput.value = address;
        if (detectedText) detectedText.textContent = address;
        if (coordsBadge) coordsBadge.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        const lowerAddr = address.toLowerCase();
        const locSelect = document.getElementById(`${mode}-room-location`);
        if (locSelect) {
            if (lowerAddr.includes('nathia')) locSelect.value = 'nathia-gali';
            else if (lowerAddr.includes('murree')) locSelect.value = 'murree';
            else if (lowerAddr.includes('islamabad')) locSelect.value = 'islamabad';
        }
    }

    window.selectLocationPrediction = function(lat, lng, address, mode) {
        document.getElementById(`${mode}-room-lat`).value = lat;
        document.getElementById(`${mode}-room-lng`).value = lng;

        const mapObj = mode === 'add' ? addRoomMap : editRoomMap;
        const markerObj = mode === 'add' ? addRoomMarker : editRoomMarker;

        if (mapObj && markerObj) {
            const coords = { lat: parseFloat(lat), lng: parseFloat(lng) };
            if (mapObj.setCenter) mapObj.setCenter(coords);
            if (mapObj.setZoom) mapObj.setZoom(16);
            if (markerObj.setPosition) markerObj.setPosition(coords);
        }

        updateMapBadgeDisplay(lat, lng, address, mode);

        const searchInput = document.getElementById(`${mode}-room-map-search`);
        if (searchInput) searchInput.value = address.split(',')[0] || address;

        const suggestionsContainer = document.getElementById(`${mode}-map-search-suggestions`);
        if (suggestionsContainer) suggestionsContainer.classList.add('hidden');
    };

    // Phonetic & Common Typo Normalizer for Pakistani Locations, Resorts & Malls
    function normalizeQueryForLocation(rawQuery) {
        if (!rawQuery) return '';
        let q = rawQuery.toLowerCase().trim();

        // Standardize phonetic variations & remove duplicated consecutive letters
        let clean = q.replace(/ee/g, 'i')
                     .replace(/ph/g, 'f')
                     .replace(/ck/g, 'k')
                     .replace(/([a-z])\1+/g, '$1');

        // Common Pakistan Location Misspelling Dictionary & Alias Mapping
        if (clean.includes('isba') || clean.includes('isla') || clean.includes('islm') || clean.includes('isb') || clean.includes('isambad')) return 'Islamabad';
        if (clean.includes('bahr') || clean.includes('baha') || clean.includes('enclav') || clean.includes('enclv')) return 'Bahria Enclave, Islamabad';
        if (clean.includes('nati') || clean.includes('nath') || clean.includes('gali') || clean.includes('galy')) return 'Nathia Gali';
        if (clean.includes('mure') || clean.includes('muri') || clean.includes('muree')) return 'Murree';
        if (clean.includes('centa') || clean.includes('centu') || clean.includes('centar') || clean.includes('cntaurus')) return 'Centaurus Mall, Islamabad';
        if (clean.includes('giga') || clean.includes('gigamal') || clean.includes('gig')) return 'Giga Mall, Islamabad';
        if (clean.includes('blu') || clean.includes('bluearia') || clean.includes('blue')) return 'Blue Area, Islamabad';
        if (clean.includes('gulb') || clean.includes('gulbburg') || clean.includes('gulbrg')) return 'Gulberg Greens, Islamabad';
        if (clean.includes('nara') || clean.includes('kagh') || clean.includes('narann')) return 'Naran, Kaghan Valley';
        if (clean.includes('dha') || clean.includes('dha2') || clean.includes('dha 2')) return 'DHA Phase 2, Islamabad';
        if (clean.includes('seren') || clean.includes('srena')) return 'Serena Hotel, Islamabad';
        if (clean.includes('mariot') || clean.includes('marriot')) return 'Marriott Hotel, Islamabad';
        if (clean.includes('monal') || clean.includes('monl')) return 'Monal Restaurant, Islamabad';
        if (clean.includes('bhurba') || clean.includes('burban')) return 'Bhurban, Murree';

        return rawQuery.trim();
    }

    // Levenshtein Distance Algorithm for Fuzzy String Matching
    function getLevenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    // Fuzzy Match Confidence Scorer (Returns 0.0 to 1.0)
    function calculateFuzzyMatchScore(query, targetText) {
        const q = query.toLowerCase().trim();
        const target = targetText.toLowerCase().trim();

        if (target.includes(q)) return 1.0;

        const qTokens = q.split(/\s+/);
        const targetTokens = target.split(/\s+/);

        let score = 0;
        for (const qt of qTokens) {
            if (qt.length <= 1) continue;
            let bestTokenScore = 0;
            for (const tt of targetTokens) {
                if (tt.includes(qt) || qt.includes(tt)) {
                    bestTokenScore = Math.max(bestTokenScore, 0.85);
                } else {
                    const dist = getLevenshteinDistance(qt, tt);
                    const maxLen = Math.max(qt.length, tt.length);
                    const similarity = 1 - (dist / maxLen);
                    if (similarity >= 0.4) {
                        bestTokenScore = Math.max(bestTokenScore, similarity);
                    }
                }
            }
            score += bestTokenScore;
        }

        return score / Math.max(1, qTokens.length);
    }

    function setupMapSearchAutocomplete(mode) {
        const input = document.getElementById(`${mode}-room-map-search`);
        if (!input) return;
        if (window.KaghanMaps) {
            KaghanMaps.initAutocomplete(`${mode}-room-map-search`, (locData) => {
                selectLocationPrediction(locData.lat, locData.lng, locData.formattedAddress, mode);
                if (window.KaghanUI) {
                    KaghanUI.showToast(`Exact location pinned: ${locData.name || locData.formattedAddress}`, 'success');
                }
            });
        }
    }

    window.searchAdminMapLocation = async function(mode) {
        const searchInput = document.getElementById(`${mode}-room-map-search`);
        if (!searchInput || !searchInput.value.trim()) {
            if (window.KaghanUI) KaghanUI.showToast('Please type an area, resort, mall, or place name', 'warning');
            return;
        }

        const rawQuery = searchInput.value.trim();
        const btn = document.getElementById(`${mode}-room-map-search-btn`) || searchInput.nextElementSibling;
        const origBtnText = btn ? btn.textContent : 'Search';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            if (window.google && window.google.maps && window.google.maps.Geocoder) {
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ address: rawQuery }, (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                        const place = results[0];
                        const lat = place.geometry.location.lat();
                        const lng = place.geometry.location.lng();
                        const addr = place.formatted_address || rawQuery;
                        selectLocationPrediction(lat, lng, addr, mode);
                        if (window.KaghanUI) KaghanUI.showToast(`Pinned location: ${place.formatted_address.split(',')[0]}`, 'success');
                    } else {
                        if (window.KaghanUI) KaghanUI.showToast(`No exact match found on Google Maps for "${rawQuery}"`, 'error');
                    }
                });
            } else if (window.KaghanMaps) {
                const geoRes = await KaghanMaps.reverseGeocode(33.7294, 73.0931);
                if (geoRes) selectLocationPrediction(33.7294, 73.0931, rawQuery, mode);
            }
        } catch (err) {
            console.error("Map search error:", err);
            if (window.KaghanUI) KaghanUI.showToast('Error searching location via Google Maps API', 'error');
        } finally {
            if (btn) btn.textContent = origBtnText;
        }
    };

    async function populateSelects() {
        const typeSelects = [document.getElementById('add-room-type'), document.getElementById('edit-room-type')];
        const locationSelects = [document.getElementById('add-room-location'), document.getElementById('edit-room-location')];
        
        const categories = await KaghanDB.getCategories();
        const locations = await KaghanDB.getLocations();

        const catOptions = categories.map(c => `<option value="${KaghanSafe.escapeHTML(c.id)}">${KaghanSafe.escapeHTML(c.label)}</option>`).join('');
        const locOptions = locations.map(l => `<option value="${KaghanSafe.escapeHTML(l.id)}">${KaghanSafe.escapeHTML(l.label)}</option>`).join('');

        typeSelects.forEach(select => {
            if (select) select.innerHTML = catOptions;
        });
        locationSelects.forEach(select => {
            if (select) select.innerHTML = locOptions;
        });

        populateFilterDropdowns(locations, categories, allInventoryRooms);
    }

    function populateFilterDropdowns(locations = [], categories = [], rooms = []) {
        const locSelect = document.getElementById('inventory-location-filter');
        const catSelect = document.getElementById('inventory-category-filter');

        if (locSelect) {
            const currentVal = locSelect.value;
            const locMap = new Map();
            locations.forEach(l => {
                if (l && l.id) locMap.set(l.id.toLowerCase(), l.label || l.name || l.id);
            });
            rooms.forEach(r => {
                if (r && r.location && !locMap.has(r.location.toLowerCase())) {
                    const formatted = r.location.charAt(0).toUpperCase() + r.location.slice(1).replace(/-/g, ' ');
                    locMap.set(r.location.toLowerCase(), formatted);
                }
            });

            let locHtml = '<option value="">All Locations</option>';
            locMap.forEach((label, val) => {
                locHtml += `<option value="${KaghanSafe.escapeHTML(val)}">${KaghanSafe.escapeHTML(label)}</option>`;
            });
            locSelect.innerHTML = locHtml;
            if (currentVal && locMap.has(currentVal.toLowerCase())) {
                locSelect.value = currentVal;
            }
        }

        if (catSelect) {
            const currentVal = catSelect.value;
            const catMap = new Map();
            categories.forEach(c => {
                if (c && c.id) catMap.set(c.id.toLowerCase(), c.label || c.name || c.id);
            });
            rooms.forEach(r => {
                if (r && r.type && !catMap.has(r.type.toLowerCase())) {
                    const formatted = r.type.charAt(0).toUpperCase() + r.type.slice(1).replace(/-/g, ' ');
                    catMap.set(r.type.toLowerCase(), formatted);
                }
            });

            let catHtml = '<option value="">All Categories</option>';
            catMap.forEach((label, val) => {
                catHtml += `<option value="${KaghanSafe.escapeHTML(val)}">${KaghanSafe.escapeHTML(label)}</option>`;
            });
            catSelect.innerHTML = catHtml;
            if (currentVal && catMap.has(currentVal.toLowerCase())) {
                catSelect.value = currentVal;
            }
        }
    }

    window.resetInventoryFilters = function() {
        const searchInput = document.getElementById('inventory-search-input');
        const locFilter = document.getElementById('inventory-location-filter');
        const catFilter = document.getElementById('inventory-category-filter');
        const statusFilter = document.getElementById('inventory-status-filter');
        const sortFilter = document.getElementById('inventory-sort-filter');

        if (searchInput) searchInput.value = '';
        if (locFilter) locFilter.value = '';
        if (catFilter) catFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        if (sortFilter) sortFilter.value = 'default';

        applyInventoryFilters();
    };

    function initInventoryFilterEvents() {
        if (inventoryFiltersBound) return;

        const searchInput = document.getElementById('inventory-search-input');
        const searchClear = document.getElementById('inventory-search-clear');
        const locFilter = document.getElementById('inventory-location-filter');
        const catFilter = document.getElementById('inventory-category-filter');
        const statusFilter = document.getElementById('inventory-status-filter');
        const sortFilter = document.getElementById('inventory-sort-filter');
        const resetBtn = document.getElementById('inventory-reset-filters-btn');

        if (searchInput) {
            searchInput.addEventListener('input', () => applyInventoryFilters());
        }

        if (searchClear) {
            searchClear.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                applyInventoryFilters();
            });
        }

        if (locFilter) locFilter.addEventListener('change', () => applyInventoryFilters());
        if (catFilter) catFilter.addEventListener('change', () => applyInventoryFilters());
        if (statusFilter) statusFilter.addEventListener('change', () => applyInventoryFilters());
        if (sortFilter) sortFilter.addEventListener('change', () => applyInventoryFilters());

        if (resetBtn) {
            resetBtn.addEventListener('click', () => window.resetInventoryFilters());
        }

        inventoryFiltersBound = true;
    }

    function applyInventoryFilters() {
        const grid = document.getElementById('admin-rooms-grid');
        if (!grid) return;

        const searchInput = document.getElementById('inventory-search-input');
        const searchClear = document.getElementById('inventory-search-clear');
        const locFilter = document.getElementById('inventory-location-filter');
        const catFilter = document.getElementById('inventory-category-filter');
        const statusFilter = document.getElementById('inventory-status-filter');
        const sortFilter = document.getElementById('inventory-sort-filter');
        const resetBtn = document.getElementById('inventory-reset-filters-btn');
        const statusBar = document.getElementById('inventory-filter-status');
        const countBadge = document.getElementById('inventory-count-badge');

        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const locVal = locFilter ? locFilter.value.toLowerCase().trim() : '';
        const catVal = catFilter ? catFilter.value.toLowerCase().trim() : '';
        const statusVal = statusFilter ? statusFilter.value.toLowerCase().trim() : '';
        const sortVal = sortFilter ? sortFilter.value : 'default';

        // Toggle clear search button
        if (searchClear) {
            if (query) searchClear.classList.remove('hidden');
            else searchClear.classList.add('hidden');
        }

        const isFiltered = Boolean(query || locVal || catVal || statusVal || (sortVal && sortVal !== 'default'));

        // Toggle Reset Button
        if (resetBtn) {
            if (isFiltered) resetBtn.classList.remove('hidden');
            else resetBtn.classList.add('hidden');
        }

        // Filter Rooms
        let filtered = allInventoryRooms.filter(room => {
            if (!room) return false;

            if (query) {
                const nameMatch = (room.name || '').toLowerCase().includes(query);
                const descMatch = (room.description || '').toLowerCase().includes(query);
                const locMatch = (room.location || '').toLowerCase().includes(query);
                const addrMatch = (room.address || '').toLowerCase().includes(query);
                const typeMatch = (room.type || '').toLowerCase().includes(query);
                const amenityMatch = (room.amenities || []).some(a => a.toLowerCase().includes(query));
                if (!nameMatch && !descMatch && !locMatch && !addrMatch && !typeMatch && !amenityMatch) {
                    return false;
                }
            }

            if (locVal) {
                const rLoc = (room.location || '').toLowerCase().trim();
                if (rLoc !== locVal) return false;
            }

            if (catVal) {
                const rType = (room.type || '').toLowerCase().trim();
                if (rType !== catVal) return false;
            }

            if (statusVal) {
                const rStatus = (room.status || 'available').toLowerCase().trim();
                if (rStatus !== statusVal) return false;
            }

            return true;
        });

        // Immediate Sorting
        if (sortVal === 'price-asc') {
            filtered.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        } else if (sortVal === 'price-desc') {
            filtered.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        } else if (sortVal === 'name-asc') {
            filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else if (sortVal === 'name-desc') {
            filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        }

        // Update status bar & counter badge
        if (statusBar && countBadge) {
            statusBar.classList.remove('hidden');
            if (isFiltered) {
                countBadge.textContent = `Showing ${filtered.length} of ${allInventoryRooms.length} room styles`;
            } else {
                countBadge.textContent = `Showing all ${allInventoryRooms.length} room styles`;
            }
        }

        // Empty State
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-sm">
                    <div class="w-12 h-12 rounded-2xl bg-amber-50 text-[#D4AF37] flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                        <i class="fa-solid fa-magnifying-glass"></i>
                    </div>
                    <h3 class="font-extrabold text-slate-900 text-base mb-1">No Matching Room Styles</h3>
                    <p class="text-xs text-slate-400 max-w-sm mx-auto mb-4 font-light">No rooms in your inventory match your current search terms or selected filters.</p>
                    <button onclick="window.resetInventoryFilters()" class="bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all inline-flex items-center gap-1.5 shadow-sm">
                        <i class="fa-solid fa-rotate-left"></i> Reset Filters
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = filtered.map(room => `
            <div class="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col justify-between hover:border-[#D4AF37] transition-all shadow-md group">
                <div>
                    <div class="relative h-44 overflow-hidden rounded-2xl mb-4 bg-slate-100">
                        <img src="${KaghanSafe.escapeHTML(room.image || (room.images && room.images.length ? room.images[0] : ''))}" alt="${KaghanSafe.escapeHTML(room.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute top-3 right-3">
                            <select onchange="changeRoomStatus('${room.id}', this.value)" class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border outline-none cursor-pointer shadow-sm ${
                                room.status === 'available' ? 'bg-emerald-500 text-white border-transparent' : 'bg-amber-500 text-white border-transparent'
                            }">
                                <option value="available" ${room.status === 'available' ? 'selected' : ''}>Available</option>
                                <option value="maintenance" ${room.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                            </select>
                        </div>
                        ${room.images && room.images.length > 1 ? `<div class="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[9px] px-2 py-1 rounded-lg font-bold"><i class="fa-solid fa-images"></i> +${room.images.length - 1}</div>` : ''}
                    </div>
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-bold text-[#0F172A] outfit text-sm leading-tight">${KaghanSafe.escapeHTML(room.name)}</h4>
                    </div>
                    <div class="text-[10px] text-[#D4AF37] font-bold mb-3 flex items-center gap-1">
                        <i class="fa-solid fa-location-dot text-[9px]"></i>
                        <span>${KaghanSafe.escapeHTML(room.location || 'Islamabad')}</span>
                    </div>
                    <div class="text-slate-400 text-xs line-clamp-2 mb-4 font-light leading-relaxed">
                        ${KaghanSafe.escapeHTML(KaghanSafe.stripTags(room.description || ''))}
                    </div>
                    <div class="flex flex-wrap gap-1 mb-4">
                        ${(room.amenities || []).slice(0, 3).map(a => `
                            <span class="bg-slate-50 text-slate-500 text-[8px] uppercase font-bold px-2 py-0.5 rounded border border-slate-100">${KaghanSafe.escapeHTML(a)}</span>
                        `).join('')}
                        ${(room.amenities || []).length > 3 ? `<span class="bg-slate-50 text-[#D4AF37] text-[8px] font-bold px-2 py-0.5 rounded border border-slate-100">+${(room.amenities || []).length - 3}</span>` : ''}
                    </div>
                </div>

                <div class="border-t border-slate-100 pt-4 flex justify-between items-center mt-4">
                    <div>
                        <span class="text-slate-400 text-[8px] uppercase tracking-wider block font-bold">Price per night</span>
                        <span class="text-sm font-black text-[#D4AF37]">${KaghanUI.formatPKR(room.price)}</span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="openAdminRoomCalendar('${room.id}')" class="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold px-2.5 py-2 rounded-lg hover:bg-amber-100 transition-all flex items-center gap-1" title="Manage Availability Calendar & Block Dates">
                            <i class="fa-regular fa-calendar-days"></i> Calendar
                        </button>
                        <button onclick="deleteRoomRecord('${room.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-bold px-2.5 py-2 rounded-lg hover:bg-rose-100 hover:text-rose-700 transition-all" title="Delete Room Style">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                        <button onclick="openEditRoomModal('${room.id}')" class="bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold px-3 py-2 rounded-lg hover:bg-slate-100 transition-all">
                            Edit Details
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async function renderRooms() {
        const rawRooms = await KaghanDB.getRooms();
        const grid = document.getElementById('admin-rooms-grid');

        if (!grid) return;

        const seen = new Set();
        allInventoryRooms = [];
        rawRooms.forEach(r => {
            if (r && r.id && !seen.has(r.id)) {
                seen.add(r.id);
                allInventoryRooms.push(r);
            }
        });

        await populateSelects();
        initInventoryFilterEvents();
        applyInventoryFilters();
    }

    window.changeRoomStatus = async (id, newStatus) => {
        const success = await KaghanDB.updateRoom(id, { status: newStatus });
        if (success) {
            KaghanUI.showToast(`Room status updated to ${newStatus}.`, 'success');
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            }
        } else {
            KaghanUI.showToast('Failed to update room status.', 'error');
        }
    };

    // Gallery helpers
    function renderGalleryPreview(containerId, dataInputId, imageUrls) {
        const container = document.getElementById(containerId);
        const dataInput = document.getElementById(dataInputId);
        if (!container || !dataInput) return;
        
        dataInput.value = JSON.stringify(imageUrls);

        if (imageUrls.length === 0) {
            container.innerHTML = `<span class="text-[10px] text-slate-400 m-auto">No images uploaded.</span>`;
            return;
        }

        container.innerHTML = imageUrls.map((url, idx) => `
            <div class="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-slate-200 group">
                <img src="${KaghanSafe.escapeHTML(url)}" alt="Room gallery preview ${idx + 1}" class="w-full h-full object-cover">
                <button type="button" onclick="removeGalleryImage('${containerId}', '${dataInputId}', ${idx})" class="absolute top-1 right-1 bg-white rounded-full w-5 h-5 flex items-center justify-center text-rose-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fa-solid fa-times text-[10px]"></i>
                </button>
            </div>
        `).join('');
    }

    window.removeGalleryImage = (containerId, dataInputId, indexToRemove) => {
        const dataInput = document.getElementById(dataInputId);
        if (!dataInput) return;
        const currentUrls = JSON.parse(dataInput.value || '[]');
        currentUrls.splice(indexToRemove, 1);
        renderGalleryPreview(containerId, dataInputId, currentUrls);
    };

    function setupCloudinaryGallery(btnId, containerId, dataInputId) {
        document.getElementById(btnId)?.addEventListener('click', () => {
            if (typeof cloudinary === 'undefined') {
                if(window.KaghanUI) KaghanUI.showToast("Cloudinary widget not loaded.", "error");
                return;
            }
            let uploadedUrls = [];
            cloudinary.openUploadWidget({
                cloudName: 'dis1ptaip',
                uploadPreset: 'mubashir',
                sources: ['local', 'url', 'camera'],
                multiple: true,
                cropping: false,
                defaultSource: 'local'
            }, (error, result) => {
                if (!error && result) {
                    if (result.event === "success") {
                        uploadedUrls.push(result.info.secure_url);
                    } else if (result.event === "queues-end") {
                        if (uploadedUrls.length > 0) {
                            const dataInput = document.getElementById(dataInputId);
                            const currentUrls = JSON.parse(dataInput.value || '[]');
                            const newUrls = [...currentUrls, ...uploadedUrls];
                            renderGalleryPreview(containerId, dataInputId, newUrls);
                            if(window.KaghanUI) KaghanUI.showToast(`${uploadedUrls.length} image(s) added to gallery!`, "success");
                            uploadedUrls = [];
                        }
                    }
                }
            });
        });
    }

    function initOfficialGooglePlacesAutocomplete(mode) {
        const input = document.getElementById(`${mode}-room-map-search`);
        if (!input || !window.google || !window.google.maps || !window.google.maps.places) return;
        if (input.dataset.googleAutocompleteInit) return;

        try {
            const autocomplete = new google.maps.places.Autocomplete(input, {
                fields: ['formatted_address', 'geometry', 'name', 'place_id']
            });

            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (!place.geometry || !place.geometry.location) return;

                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                const address = place.formatted_address || place.name || input.value;

                selectLocationPrediction(lat, lng, address, mode);
                if (window.KaghanUI) {
                    KaghanUI.showToast(`Exact location pinned: ${place.name || address}`, 'success');
                }
            });

            input.dataset.googleAutocompleteInit = 'true';
        } catch (e) {
            console.warn("Google Places Autocomplete init warning:", e);
        }
    }

    function ensureGoogleMapsApiLoaded() {
        const savedKey = localStorage.getItem('GOOGLE_MAPS_API_KEY') || 'AIzaSyBZDGmZLoC7CiNY1nV6y2UtsfexCD-C9Lk';
        if (window.google && window.google.maps) {
            initOfficialGooglePlacesAutocomplete('add');
            initOfficialGooglePlacesAutocomplete('edit');
            return;
        }

        const existingScript = document.getElementById('google-maps-js-sdk');
        if (existingScript) return;

        const script = document.createElement('script');
        script.id = 'google-maps-js-sdk';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(savedKey)}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            console.log("Official Google Maps Places API loaded for inventory creation & edit.");
            initOfficialGooglePlacesAutocomplete('add');
            initOfficialGooglePlacesAutocomplete('edit');
        };
        document.head.appendChild(script);
    }

    // Edit Room Modal operations
    window.openEditRoomModal = async (id) => {
        ensureGoogleMapsApiLoaded();
        activeEditRoomId = id;
        const room = await KaghanDB.getRoomById(id);
        if (!room) return;

        await populateSelects();

        document.getElementById('edit-room-name-lbl').innerText = room.name;
        document.getElementById('edit-room-name').value = room.name;
        
        setTimeout(() => {
            document.getElementById('edit-room-type').value = room.type;
            document.getElementById('edit-room-location').value = room.location || 'islamabad';
        }, 50);

        document.getElementById('edit-room-price').value = room.price;
        document.getElementById('edit-room-price-original').value = room.originalPrice || '';
        document.getElementById('edit-room-price-weekly').value = room.priceWeekly || '';
        document.getElementById('edit-room-price-monthly').value = room.priceMonthly || '';
        document.getElementById('edit-room-guests').value = room.maxGuests || 2;
        if (document.getElementById('edit-room-bedrooms')) document.getElementById('edit-room-bedrooms').value = room.bedrooms || 1;
        if (document.getElementById('edit-room-bathrooms')) document.getElementById('edit-room-bathrooms').value = room.bathrooms || 1;
        if (document.getElementById('edit-room-area')) document.getElementById('edit-room-area').value = room.area || '';
        if (document.getElementById('edit-room-beds-config')) document.getElementById('edit-room-beds-config').value = room.bedsConfig || '';
        if (document.getElementById('edit-room-highlights')) document.getElementById('edit-room-highlights').value = (room.highlights || []).join(', ');
        if (document.getElementById('edit-room-video-url')) document.getElementById('edit-room-video-url').value = room.videoUrl || '';

        const editDescEl = document.getElementById('edit-room-desc');
        if (editDescEl) {
            editDescEl.value = room.description || '';
        }
        if (typeof tinymce !== 'undefined' && tinymce.get('edit-room-desc')) {
            tinymce.get('edit-room-desc').setContent(room.description || '');
        }
        document.getElementById('edit-room-amenities').value = (room.amenities || []).join(', ');

        const imagesArray = room.images || (room.image ? [room.image] : []);
        renderGalleryPreview('edit-room-gallery-preview', 'edit-room-images-data', imagesArray);

        const modal = document.getElementById('edit-room-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            
            // Initialize Edit Map with Google Maps Tiles & Marker
            const lat = room.lat || 33.7294; // Default to Islamabad
            const lng = room.lng || 73.0931;
            document.getElementById('edit-room-lat').value = lat;
            document.getElementById('edit-room-lng').value = lng;

            setupMapSearchAutocomplete('edit');
            const initialAddr = room.address || (room.locationName ? `${room.locationName}, ${room.location}` : 'Islamabad, Pakistan');
            updateMapBadgeDisplay(lat, lng, initialAddr, 'edit');
            initNativeAdminMap('edit', lat, lng);
        }, 300); // give time for transition so map size calculates correctly
    };

    window.closeEditRoomModal = () => {
        const modal = document.getElementById('edit-room-modal');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            activeEditRoomId = null;
        }, 300);
    };

    // Save edited changes
    function setupEditRoomForm() {
        const editForm = document.getElementById('edit-room-form');
        if (!editForm) return;

        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!activeEditRoomId) return;

            if (typeof tinymce !== 'undefined') {
                tinymce.triggerSave();
            }

            const btn = editForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
            btn.disabled = true;

            try {
                const name = document.getElementById('edit-room-name').value.trim();
                const type = document.getElementById('edit-room-type').value;
                const location = document.getElementById('edit-room-location').value;
                const price = parseInt(document.getElementById('edit-room-price').value);
                const originalPrice = parseInt(document.getElementById('edit-room-price-original').value);
                const priceWeekly = parseInt(document.getElementById('edit-room-price-weekly').value);
                const priceMonthly = parseInt(document.getElementById('edit-room-price-monthly').value);
                const maxGuests = parseInt(document.getElementById('edit-room-guests').value);
                const bedrooms = parseInt(document.getElementById('edit-room-bedrooms')?.value || '1');
                const bathrooms = parseInt(document.getElementById('edit-room-bathrooms')?.value || '1');
                const area = document.getElementById('edit-room-area')?.value.trim() || '';
                const bedsConfig = document.getElementById('edit-room-beds-config')?.value.trim() || '';
                const highlightsInput = document.getElementById('edit-room-highlights')?.value.trim() || '';
                const videoUrl = document.getElementById('edit-room-video-url')?.value.trim() || '';
                const descEl = document.getElementById('edit-room-desc');
                const description = descEl ? descEl.value.trim() : '';
                const amenitiesInput = document.getElementById('edit-room-amenities').value.trim();
                const imagesStr = document.getElementById('edit-room-images-data').value;
                const imagesArray = JSON.parse(imagesStr || '[]');
                const lat = parseFloat(document.getElementById('edit-room-lat').value);
                const lng = parseFloat(document.getElementById('edit-room-lng').value);

                if (!name || isNaN(price) || price <= 0 || !description || isNaN(maxGuests) || maxGuests <= 0) {
                    KaghanUI.showToast('Please enter valid room details.', 'error');
                    return;
                }

                const amenities = amenitiesInput
                    ? amenitiesInput.split(',').map(a => a.trim()).filter(a => a !== '')
                    : ['King Bed', 'High-Speed Wi-Fi', 'Smart TV'];

                const highlights = highlightsInput
                    ? highlightsInput.split(',').map(h => h.trim()).filter(h => h !== '')
                    : [];

                const address = document.getElementById('edit-room-address')?.value.trim() || '';

                const updatedData = {
                    name,
                    type,
                    price,
                    originalPrice: isNaN(originalPrice) ? null : originalPrice,
                    isApartment: true,
                    priceWeekly: isNaN(priceWeekly) ? null : priceWeekly,
                    priceMonthly: isNaN(priceMonthly) ? null : priceMonthly,
                    maxGuests,
                    bedrooms: isNaN(bedrooms) ? 1 : bedrooms,
                    bathrooms: isNaN(bathrooms) ? 1 : bathrooms,
                    area,
                    bedsConfig,
                    highlights,
                    videoUrl,
                    description,
                    amenities,
                    location,
                    address,
                    lat: isNaN(lat) ? null : lat,
                    lng: isNaN(lng) ? null : lng,
                    images: imagesArray,
                    image: imagesArray.length > 0 ? imagesArray[0] : ''
                };

                const success = await KaghanDB.updateRoom(activeEditRoomId, updatedData);
                if (success) {
                    KaghanUI.showToast('Room style details updated successfully!', 'success');
                    if (window.AdminDashboardModule) {
                        await window.AdminDashboardModule.refreshAll();
                    }
                    closeEditRoomModal();
                } else {
                    KaghanUI.showToast('Failed to update room details.', 'error');
                }
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // Add new room with Cloudinary uploads
    function setupAddRoomForm() {
        const form = document.getElementById('add-room-form');
        if (!form) return;
        
        let currentWizardStep = 1;
        window.setAddRoomStep = function(stepNum) {
            currentWizardStep = stepNum;
            for (let i = 1; i <= 6; i++) {
                const stepEl = document.getElementById(`add-wizard-step-${i}`);
                const nodeEl = document.getElementById(`wizard-node-${i}`);
                if (stepEl) {
                    if (i === stepNum) stepEl.classList.remove('hidden');
                    else stepEl.classList.add('hidden');
                }
                if (nodeEl) {
                    nodeEl.classList.remove('active', 'completed');
                    if (i === stepNum) nodeEl.classList.add('active');
                    else if (i < stepNum) nodeEl.classList.add('completed');
                }
            }
            if (stepNum === 6) {
                const name = document.getElementById('add-room-name')?.value || '—';
                const price = document.getElementById('add-room-price')?.value || '0';
                const type = document.getElementById('add-room-type')?.value || '—';
                const summaryEl = document.getElementById('add-wizard-review-summary');
                if (summaryEl) {
                    summaryEl.innerHTML = `
                        <div class="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                            <div class="font-bold text-sm text-slate-900">${KaghanSafe.escapeHTML(name)}</div>
                            <div class="text-slate-600">Style: <strong>${KaghanSafe.escapeHTML(type)}</strong> • Rate: <strong>PKR ${price}</strong>/night</div>
                            <div class="text-emerald-600 font-bold pt-2"><i class="fa-solid fa-circle-check mr-1"></i> All steps completed! Click Publish Suite below to add to inventory.</div>
                        </div>
                    `;
                }
            }
        };

        window.openAddRoomModal = async () => {
            ensureGoogleMapsApiLoaded();
            await populateSelects();
            renderGalleryPreview('add-room-gallery-preview', 'add-room-images-data', []);
            window.setAddRoomStep(1);
            const modal = document.getElementById('add-room-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            const addDescEl = document.getElementById('add-room-desc');
            if (addDescEl) {
                addDescEl.value = '';
            }
            if (typeof tinymce !== 'undefined' && tinymce.get('add-room-desc')) {
                tinymce.get('add-room-desc').setContent('');
            }
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                
                // Initialize Add Map with Google Maps Tiles & Marker
                const lat = 33.7294; // Default to Islamabad
                const lng = 73.0931;
                document.getElementById('add-room-lat').value = lat;
                document.getElementById('add-room-lng').value = lng;

                setupMapSearchAutocomplete('add');
                updateMapBadgeDisplay(lat, lng, 'Islamabad, Pakistan', 'add');
                initNativeAdminMap('add', lat, lng);
            }, 300);
        };

        window.closeAddRoomModal = () => {
            const modal = document.getElementById('add-room-modal');
            modal.classList.add('opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                form.reset();
            }, 300);
        };

        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (typeof tinymce !== 'undefined') {
                tinymce.triggerSave();
            }
            
            const btn = newForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
            btn.disabled = true;

            try {
                const name = document.getElementById('add-room-name').value.trim();
                const type = document.getElementById('add-room-type').value;
                const location = document.getElementById('add-room-location').value;
                const price = parseInt(document.getElementById('add-room-price').value);
                const originalPrice = parseInt(document.getElementById('add-room-price-original').value);
                const priceWeekly = parseInt(document.getElementById('add-room-price-weekly').value);
                const priceMonthly = parseInt(document.getElementById('add-room-price-monthly').value);
                const maxGuests = parseInt(document.getElementById('add-room-guests').value);
                const addDescEl = document.getElementById('add-room-desc');
                const description = addDescEl ? addDescEl.value.trim() : '';
                const amenitiesInput = document.getElementById('add-room-amenities').value.trim();
                
                const imagesStr = document.getElementById('add-room-images-data').value;
                const imagesArray = JSON.parse(imagesStr || '[]');
                const lat = parseFloat(document.getElementById('add-room-lat').value);
                const lng = parseFloat(document.getElementById('add-room-lng').value);

                if (!name || isNaN(price) || price <= 0 || !description || isNaN(maxGuests) || maxGuests <= 0) {
                    KaghanUI.showToast('Please enter valid room details.', 'error');
                    return;
                }

                const bedrooms = parseInt(document.getElementById('add-room-bedrooms')?.value || '1');
                const bathrooms = parseInt(document.getElementById('add-room-bathrooms')?.value || '1');
                const area = document.getElementById('add-room-area')?.value.trim() || '';
                const bedsConfig = document.getElementById('add-room-beds-config')?.value.trim() || '';
                const highlightsInput = document.getElementById('add-room-highlights')?.value.trim() || '';
                const videoUrl = document.getElementById('add-room-video-url')?.value.trim() || '';

                const highlights = highlightsInput 
                    ? highlightsInput.split(',').map(h => h.trim()).filter(h => h !== '')
                    : [];

                let imageUrl = imagesArray.length > 0 ? imagesArray[0] : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
                if (imagesArray.length === 0) imagesArray.push(imageUrl);

                const amenities = amenitiesInput
                    ? amenitiesInput.split(',').map(a => a.trim()).filter(a => a !== '')
                    : ['King Bed', 'High-Speed Wi-Fi', 'Smart TV'];

                const address = document.getElementById('add-room-address')?.value.trim() || '';

                const newRoom = {
                    id: 'room-' + type + '-' + Date.now(),
                    name,
                    type,
                    price,
                    originalPrice: isNaN(originalPrice) ? null : originalPrice,
                    isApartment: true,
                    priceWeekly: isNaN(priceWeekly) ? null : priceWeekly,
                    priceMonthly: isNaN(priceMonthly) ? null : priceMonthly,
                    image: imageUrl,
                    images: imagesArray,
                    maxGuests,
                    bedrooms: isNaN(bedrooms) ? 1 : bedrooms,
                    bathrooms: isNaN(bathrooms) ? 1 : bathrooms,
                    area,
                    bedsConfig,
                    highlights,
                    videoUrl,
                    description,
                    amenities,
                    location,
                    address,
                    lat: isNaN(lat) ? null : lat,
                    lng: isNaN(lng) ? null : lng,
                    status: 'available',
                    rating: 5.0,
                    reviewsCount: 0
                };

                await KaghanDB.addRoom(newRoom);
                KaghanUI.showToast(`Suite "${name}" added to resort inventory!`, 'success');
                
                if (window.AdminDashboardModule) {
                    await window.AdminDashboardModule.refreshAll();
                }
                closeAddRoomModal();
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    window.deleteRoomRecord = async (roomId) => {
        if (!confirm(`Are you sure you want to permanently delete room/suite style "${roomId}"?`)) return;
        const success = await KaghanDB.deleteRoom(roomId);
        if (success) {
            KaghanUI.showToast(`Room style ${roomId} successfully removed.`, 'success');
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            }
        } else {
            KaghanUI.showToast('Failed to delete room style.', 'error');
        }
    };

    // Admin Availability Calendar & Blocked Dates Management
    let activeAdminRoomId = null;
    let activeAdminBlockedDates = new Set();
    let activeAdminBookedDatesMap = new Map(); // isoStr -> booking details

    window.openAdminRoomCalendar = async (roomId) => {
        activeAdminRoomId = roomId;
        const room = await KaghanDB.getRoomById(roomId);
        if (!room) return;

        const nameLbl = document.getElementById('admin-calendar-room-name');
        if (nameLbl) nameLbl.textContent = `Calendar: ${room.name}`;

        activeAdminBlockedDates = new Set(room.blockedDates || []);
        
        // Fetch active bookings for this room
        const bookings = await KaghanDB.getBookings();
        activeAdminBookedDatesMap = new Map();

        if (bookings && bookings.length > 0) {
            bookings.forEach(b => {
                if (b.roomId === roomId && b.status !== 'cancelled') {
                    const start = new Date(b.checkIn);
                    const end = new Date(b.checkOut);
                    for (let dt = new Date(start); dt < end; dt.setDate(dt.getDate() + 1)) {
                        const iso = dt.toISOString().split('T')[0];
                        activeAdminBookedDatesMap.set(iso, b);
                    }
                }
            });
        }

        renderAdminCalendarGrid();

        const modal = document.getElementById('admin-room-calendar-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                const content = modal.querySelector('.transform');
                if (content) content.classList.remove('scale-95');
            }, 50);
        }
    };

    window.closeAdminRoomCalendarModal = () => {
        const modal = document.getElementById('admin-room-calendar-modal');
        if (!modal) return;
        modal.classList.add('opacity-0');
        const content = modal.querySelector('.transform');
        if (content) content.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            activeAdminRoomId = null;
        }, 300);
    };

    function renderAdminCalendarGrid() {
        const container = document.getElementById('admin-calendar-grid-container');
        const summary = document.getElementById('admin-calendar-summary');
        if (!container) return;

        if (summary) {
            summary.textContent = `${activeAdminBlockedDates.size} date(s) currently blocked by admin`;
        }

        const today = new Date();
        today.setHours(0,0,0,0);

        let html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-8 select-none">`;

        for (let m = 0; m < 2; m++) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() + m, 1);
            const year = monthDate.getFullYear();
            const month = monthDate.getMonth();
            const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const firstDayIndex = new Date(year, month, 1).getDay();
            const totalDays = new Date(year, month + 1, 0).getDate();

            html += `
                <div>
                    <div class="text-center font-bold text-slate-900 text-sm mb-3 outfit">${monthName}</div>
                    <div class="grid grid-cols-7 gap-1 text-center text-[10px] uppercase font-bold text-slate-400 mb-2">
                        <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                    </div>
                    <div class="grid grid-cols-7 gap-1 text-center text-xs font-medium">
            `;

            for (let i = 0; i < firstDayIndex; i++) {
                html += `<div></div>`;
            }

            for (let d = 1; d <= totalDays; d++) {
                const cellDate = new Date(year, month, d);
                cellDate.setHours(0,0,0,0);
                const isoStr = cellDate.getFullYear() + '-' + String(cellDate.getMonth() + 1).padStart(2, '0') + '-' + String(cellDate.getDate()).padStart(2, '0');

                const isPast = cellDate < today;
                const isGuestReserved = activeAdminBookedDatesMap.has(isoStr);
                const isAdminBlocked = activeAdminBlockedDates.has(isoStr);

                let cellClass = "h-9 rounded-xl flex flex-col items-center justify-center font-bold text-xs transition-all relative cursor-pointer ";
                let titleAttr = "Click to block date";

                if (isPast) {
                    cellClass += "text-slate-300 bg-slate-50 cursor-not-allowed ";
                    titleAttr = "Past date";
                } else if (isGuestReserved) {
                    const booking = activeAdminBookedDatesMap.get(isoStr);
                    cellClass += "bg-blue-500 text-white shadow-sm cursor-not-allowed ";
                    titleAttr = `Guest Booking #${booking.id || ''} (${booking.userName || booking.guestName || 'Guest'})`;
                } else if (isAdminBlocked) {
                    cellClass += "bg-rose-500 text-white shadow-sm hover:bg-rose-600 ";
                    titleAttr = "Admin Blocked - Click to unblock";
                } else {
                    cellClass += "bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300 ";
                    titleAttr = "Available - Click to block";
                }

                const clickAttr = (isPast || isGuestReserved) ? '' : `onclick="toggleAdminBlockDate('${isoStr}')"`;

                html += `
                    <div class="${cellClass}" ${clickAttr} title="${titleAttr}">
                        <span>${d}</span>
                        ${isAdminBlocked ? '<span class="text-[8px] leading-none font-bold uppercase mt-0.5">Blocked</span>' : ''}
                        ${isGuestReserved ? '<span class="text-[8px] leading-none font-bold uppercase mt-0.5">Booked</span>' : ''}
                    </div>
                `;
            }

            html += `</div></div>`;
        }

        html += `</div>`;
        container.innerHTML = html;
    }

    window.toggleAdminBlockDate = (isoStr) => {
        if (activeAdminBlockedDates.has(isoStr)) {
            activeAdminBlockedDates.delete(isoStr);
        } else {
            activeAdminBlockedDates.add(isoStr);
        }
        renderAdminCalendarGrid();
    };

    window.adminQuickBlockWeekend = () => {
        const today = new Date();
        const nextSat = new Date();
        nextSat.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7));
        const nextSun = new Date(nextSat);
        nextSun.setDate(nextSat.getDate() + 1);

        const satIso = nextSat.toISOString().split('T')[0];
        const sunIso = nextSun.toISOString().split('T')[0];

        activeAdminBlockedDates.add(satIso);
        activeAdminBlockedDates.add(sunIso);
        renderAdminCalendarGrid();
        if (window.KaghanUI) KaghanUI.showToast("Next weekend dates added to blocked list", "info");
    };

    window.adminClearAllBlocks = () => {
        activeAdminBlockedDates.clear();
        renderAdminCalendarGrid();
        if (window.KaghanUI) KaghanUI.showToast("Cleared all admin blocked dates", "info");
    };

    window.saveAdminBlockedDates = async () => {
        if (!activeAdminRoomId) return;

        const btn = document.getElementById('save-admin-blocked-dates-btn');
        const origText = btn ? btn.innerHTML : 'Save Availability';
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;
        }

        try {
            const blockedArray = Array.from(activeAdminBlockedDates).sort();
            const success = await KaghanDB.updateRoom(activeAdminRoomId, { blockedDates: blockedArray });

            if (success) {
                if (window.KaghanUI) KaghanUI.showToast("Listing availability & blocked dates updated!", "success");
                closeAdminRoomCalendarModal();
                if (window.AdminDashboardModule) {
                    await window.AdminDashboardModule.refreshAll();
                } else {
                    renderRooms();
                }
            } else {
                if (window.KaghanUI) KaghanUI.showToast("Failed to update availability.", "error");
            }
        } finally {
            if (btn) {
                btn.innerHTML = origText;
                btn.disabled = false;
            }
        }
    };

    // Export to window
    window.AdminInventoryModule = {
        render: renderRooms,
        initForms: () => {
            setupEditRoomForm();
            setupAddRoomForm();
            setupCloudinaryGallery('upload-edit-room-img-btn', 'edit-room-gallery-preview', 'edit-room-images-data');
            setupCloudinaryGallery('upload-add-room-img-btn', 'add-room-gallery-preview', 'add-room-images-data');
            
            // Initialize TinyMCE editors with high z-index for dropdowns & popups
            if (typeof tinymce !== 'undefined') {
                tinymce.init({
                    selector: '#add-room-desc, #edit-room-desc',
                    plugins: 'anchor autolink charmap codesample emoticons image link lists media searchreplace table visualblocks wordcount',
                    toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat',
                    height: 320,
                    promotion: false,
                    branding: false,
                    zIndex: 999999,
                    setup: function (editor) {
                        editor.on('change keyup NodeChange', function () {
                            editor.save();
                        });
                    }
                });

                // Prevent modal focus trap from blocking TinyMCE dropdowns, popups, and dialogs
                document.addEventListener('focusin', (e) => {
                    if (e.target.closest && e.target.closest('.tox-tinymce-aux, .tox-dialog, .tox-menu, .tox-pop, .tox')) {
                        e.stopImmediatePropagation();
                    }
                }, true);
            }
        }
    };
})();
