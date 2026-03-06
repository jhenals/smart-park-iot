/**
 * Initializes and returns a Leaflet map with a tile layer.
 * @param {string} mapElementId - The DOM element id for the map container.
 * @param {[number, number]} centerCoords - [lat, lng] for the map center.
 * @param {number} zoom - Initial zoom level.
 * @param {object} [tileOptions] - Optional tile layer options.
 * @returns {object} The Leaflet map instance.
 */
export function createBaseMap(mapElementId, centerCoords, zoom = 15, tileOptions = {}) {
	const map = L.map(mapElementId).setView(centerCoords, zoom);
	L.tileLayer(
		"https://tile.openstreetmap.org/{z}/{x}/{y}.png",
		Object.assign({
			attribution: "&copy; OpenStreetMap contributors",
		}, tileOptions)
	).addTo(map);
	return map;
}


/**
 * Creates a marker on the specified map.
 * @param {object} map - The Leaflet map instance.
 * @param {number} lat - Latitude coordinate.
 * @param {number} lng - Longitude coordinate.
 * @param {string} [iconUrl] - URL for the marker icon.
 * @returns {object} The Leaflet marker instance.
 */
export function createMarker(map, lat, lng, iconUrl = "https://maps.google.com/mapfiles/ms/icons/blue-dot.png") {
    const icon = L.icon({
        iconUrl: iconUrl,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });
    
    return L.marker([lat, lng], { icon }).addTo(map);
}

/**
 * Creates an accuracy circle on the specified map.
 * @param {object} map - The Leaflet map instance.
 * @param {number} lat - Latitude coordinate.
 * @param {number} lng - Longitude coordinate.
 * @param {number} radius - Radius in meters.
 * @param {string} [color] - Circle color.
 * @returns {object} The Leaflet circle instance.
 */
export function createAccuracyCircle(map, lat, lng, radius, color = "#0066cc") {
    return L.circle([lat, lng], {
        radius: radius,
        color: color,
        fillColor: color,
        fillOpacity: 0.1,
        weight: 2,
    }).addTo(map);
}