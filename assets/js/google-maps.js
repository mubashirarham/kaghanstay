// Kaghan Stay - Core Unified Google Maps, Places API & Geocoding Integration Module

(function() {
    const API_KEY = 'AIzaSyBZDGmZLoC7CiNY1nV6y2UtsfexCD-C9Lk';
    let isSdkLoading = false;
    let sdkLoadedCallbacks = [];

    /**
     * Ensures Google Maps JavaScript SDK is loaded cleanly.
     */
    function loadSdk(callback) {
        if (window.google && window.google.maps && window.google.maps.places) {
            if (typeof callback === 'function') callback();
            return;
        }

        if (typeof callback === 'function') {
            sdkLoadedCallbacks.push(callback);
        }

        if (isSdkLoading) return;
        isSdkLoading = true;

        const existingScript = document.getElementById('kaghan-google-maps-sdk');
        if (existingScript) return;

        const script = document.createElement('script');
        script.id = 'kaghan-google-maps-sdk';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&libraries=places,marker,geometry&v=weekly`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            console.log("Google Maps JS (Advanced Markers, Places & Geocoding) SDK loaded successfully.");
            isSdkLoading = false;
            sdkLoadedCallbacks.forEach(cb => {
                try { cb(); } catch (e) { console.error("SDK load callback error:", e); }
            });
            sdkLoadedCallbacks = [];
        };

        script.onerror = (err) => {
            console.error("Failed to load Google Maps SDK:", err);
            isSdkLoading = false;
        };

        document.head.appendChild(script);
    }

    /**
     * Attaches modern Google Places AutocompleteService & Geocoder to any input field.
     * Completely bypasses legacy google.maps.places.Autocomplete constructor to eliminate deprecation warnings.
     */
    function initAutocomplete(inputId, onSelectCallback, options = {}) {
        loadSdk(() => {
            const input = document.getElementById(inputId);
            if (!input || input.dataset.googleAutocompleteBound) return;
            input.dataset.googleAutocompleteBound = 'true';

            // Ensure parent container has relative positioning for dropdown
            const parent = input.parentNode;
            if (parent && window.getComputedStyle(parent).position === 'static') {
                parent.style.position = 'relative';
            }

            let dropdown = document.getElementById(`${inputId}-google-predictions`);
            if (!dropdown) {
                dropdown = document.createElement('div');
                dropdown.id = `${inputId}-google-predictions`;
                dropdown.className = 'absolute left-0 right-0 top-full mt-1.5 bg-[#0F172A]/95 backdrop-blur-xl border border-[#C5A059]/40 rounded-2xl shadow-2xl z-[100] max-h-64 overflow-y-auto hidden divide-y divide-white/5';
                if (parent) parent.appendChild(dropdown);
            }

            let debounceTimer = null;
            const service = new google.maps.places.AutocompleteService();
            const geocoder = new google.maps.Geocoder();

            input.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                clearTimeout(debounceTimer);

                if (query.length < 2) {
                    dropdown.classList.add('hidden');
                    dropdown.innerHTML = '';
                    return;
                }

                debounceTimer = setTimeout(() => {
                    const req = { input: query, componentRestrictions: { country: options.country || 'pk' } };
                    service.getPlacePredictions(req, (predictions, status) => {
                        if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions || predictions.length === 0) {
                            dropdown.classList.add('hidden');
                            return;
                        }

                        let html = '';
                        predictions.slice(0, 5).forEach(pred => {
                            const mainText = pred.structured_formatting ? pred.structured_formatting.main_text : pred.description;
                            const secText = pred.structured_formatting ? pred.structured_formatting.secondary_text : '';
                            
                            html += `
                                <div data-place-id="${pred.place_id}" data-desc="${(pred.description || '').replace(/"/g, '&quot;')}" class="kaghan-place-pred-item p-3 hover:bg-[#C5A059]/20 cursor-pointer text-xs text-white flex items-start gap-3 transition-colors">
                                    <i class="fa-solid fa-location-dot text-[#C5A059] mt-0.5 shrink-0"></i>
                                    <div class="overflow-hidden">
                                        <div class="font-bold text-white truncate">${mainText}</div>
                                        <div class="text-[10px] text-slate-300 truncate">${secText}</div>
                                    </div>
                                </div>
                            `;
                        });

                        dropdown.innerHTML = html;
                        dropdown.classList.remove('hidden');

                        dropdown.querySelectorAll('.kaghan-place-pred-item').forEach(item => {
                            item.addEventListener('click', () => {
                                const placeId = item.dataset.placeId;
                                const desc = item.dataset.desc || item.innerText;
                                input.value = desc.split(',')[0];
                                dropdown.classList.add('hidden');

                                geocoder.geocode({ placeId: placeId }, (results, geoStatus) => {
                                    if (geoStatus === 'OK' && results && results[0]) {
                                        const place = results[0];
                                        if (typeof onSelectCallback === 'function') {
                                            onSelectCallback({
                                                placeId: placeId,
                                                name: desc.split(',')[0],
                                                formattedAddress: place.formatted_address,
                                                lat: place.geometry.location.lat(),
                                                lng: place.geometry.location.lng()
                                            });
                                        }
                                    }
                                });
                            });
                        });
                    });
                }, 200);
            });

            // Hide predictions when clicking outside
            document.addEventListener('click', (evt) => {
                if (!input.contains(evt.target) && !dropdown.contains(evt.target)) {
                    dropdown.classList.add('hidden');
                }
            });
        });
    }

    /**
     * Reverse Geocodes coordinates [lat, lng] into a human-readable address.
     */
    function reverseGeocode(lat, lng) {
        return new Promise((resolve, reject) => {
            loadSdk(() => {
                if (!window.google || !window.google.maps) {
                    return reject("Google Maps SDK not loaded");
                }
                const geocoder = new google.maps.Geocoder();
                const latlng = { lat: parseFloat(lat), lng: parseFloat(lng) };

                geocoder.geocode({ location: latlng }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        resolve({
                            formattedAddress: results[0].formatted_address,
                            placeId: results[0].place_id,
                            results: results
                        });
                    } else {
                        reject(`Geocoding failed due to: ${status}`);
                    }
                });
            });
        });
    }

    /**
     * Renders an interactive Google Map using AdvancedMarkerElement when available.
     */
    function renderMap(containerId, config = {}) {
        loadSdk(() => {
            const container = document.getElementById(containerId);
            if (!container || !window.google || !window.google.maps) return;

            const lat = parseFloat(config.lat || 33.7294);
            const lng = parseFloat(config.lng || 73.0931);
            const centerCoords = { lat, lng };

            // Luxury Dark Theme Styling for Google Maps
            const darkMapStyle = [
                { "elementType": "geometry", "stylers": [{ "color": "#1d2c4d" }] },
                { "elementType": "labels.text.fill", "stylers": [{ "color": "#8ec3b9" }] },
                { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1a3646" }] },
                { "featureType": "administrative.country", "elementType": "geometry.stroke", "stylers": [{ "color": "#4b687a" }] },
                { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#023e58" }] },
                { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#283d6a" }] },
                { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#304a7d" }] },
                { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0e1626" }] }
            ];

            const map = new google.maps.Map(container, {
                center: centerCoords,
                zoom: config.zoom || 15,
                mapId: 'DEMO_MAP_ID',
                styles: config.darkTheme !== false ? darkMapStyle : [],
                disableDefaultUI: config.disableDefaultUI || false,
                zoomControl: true,
                mapTypeControl: false
            });

            let marker;
            if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
                marker = new google.maps.marker.AdvancedMarkerElement({
                    position: centerCoords,
                    map: map,
                    title: config.title || 'Kaghan Stay Hotel & Suite',
                    gmpDraggable: !!config.draggable
                });
                if (config.draggable && typeof config.onDragEnd === 'function') {
                    marker.addListener('dragend', () => {
                        const pos = marker.position;
                        const newLat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
                        const newLng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
                        config.onDragEnd({ lat: newLat, lng: newLng });
                    });
                }
            } else {
                marker = new google.maps.Marker({
                    position: centerCoords,
                    map: map,
                    title: config.title || 'Kaghan Stay Hotel & Suite',
                    draggable: !!config.draggable
                });
                if (config.draggable && typeof config.onDragEnd === 'function') {
                    marker.addListener('dragend', (e) => {
                        config.onDragEnd({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                    });
                }
            }

            // InfoWindow Content
            if (config.title || config.address) {
                const infoContent = `
                    <div style="color: #0F172A; padding: 6px; font-family: sans-serif; max-width: 220px;">
                        <h4 style="margin:0 0 4px 0; font-size: 13px; font-weight: 800;">${config.title || 'Kaghan Stay'}</h4>
                        ${config.address ? `<p style="margin:0 0 6px 0; font-size: 11px; color: #475569;">${config.address}</p>` : ''}
                        ${config.price ? `<div style="font-size: 12px; font-weight: 700; color: #C5A059;">PKR ${config.price} / night</div>` : ''}
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" style="display:inline-block; margin-top: 6px; font-size: 10px; font-weight: 700; color: #2563EB; text-decoration: underline;">Get Directions &rarr;</a>
                    </div>
                `;
                const infoWindow = new google.maps.InfoWindow({ content: infoContent });
                const markerTarget = marker.element || marker;
                if (marker.addListener) {
                    marker.addListener('click', () => { infoWindow.open(map, marker); });
                } else if (markerTarget && markerTarget.addEventListener) {
                    markerTarget.addEventListener('click', () => { infoWindow.open(map, marker); });
                }
            }

            return { map, marker };
        });
    }

    /**
     * Uses Google Places Service to find nearby attractions.
     */
    function fetchNearbyAttractions(lat, lng, containerId) {
        loadSdk(() => {
            const container = document.getElementById(containerId);
            if (!container || !window.google || !window.google.maps) return;

            const dummyElement = document.createElement('div');
            const service = new google.maps.places.PlacesService(dummyElement);
            const location = new google.maps.LatLng(lat, lng);

            const request = {
                location: location,
                radius: '5000',
                type: ['tourist_attraction', 'restaurant', 'park', 'natural_feature', 'point_of_interest']
            };

            service.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                    let html = '';
                    results.slice(0, 6).forEach(place => {
                        const rating = place.rating ? `★ ${place.rating}` : '★ 4.8';
                        const photoUrl = place.photos && place.photos.length > 0 
                            ? place.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 })
                            : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80';

                        html += `
                            <div class="glass-card rounded-2xl p-3 flex items-center gap-3 border border-slate-800 hover:border-[#C5A059] transition-all">
                                <img src="${photoUrl}" alt="${place.name}" class="w-16 h-16 rounded-xl object-cover shrink-0">
                                <div class="overflow-hidden">
                                    <h5 class="text-xs font-bold text-white truncate">${place.name}</h5>
                                    <p class="text-[10px] text-slate-400 truncate">${place.vicinity || 'Kaghan Valley'}</p>
                                    <div class="flex items-center gap-2 mt-1">
                                        <span class="text-[10px] text-amber-400 font-bold">${rating}</span>
                                        <a href="https://www.google.com/maps/place/?q=place_id:${place.place_id}" target="_blank" class="text-[10px] text-[#C5A059] hover:underline font-semibold">View &rarr;</a>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    container.innerHTML = html;
                } else {
                    container.innerHTML = `
                        <div class="col-span-full text-center py-6 text-xs text-slate-400">
                            <i class="fa-solid fa-compass text-amber-500 mb-1 text-base block"></i>
                            Explore scenic valley viewpoints, local dining, and hiking trails nearby.
                        </div>
                    `;
                }
            });
        });
    }

    loadSdk();

    window.KaghanMaps = {
        loadSdk,
        initAutocomplete,
        reverseGeocode,
        renderMap,
        fetchNearbyAttractions
    };
})();
