let globalLat = null;
let globalLon = null;
let globalLastIrriDate = null;
let viewingSavedField = false;
let currentFieldToDeleteId = null;
let currentIrrigationFieldId = null;
let deleteBtnTarget = null;

// Restrict all date inputs to max today
document.addEventListener("DOMContentLoaded", () => {
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.setAttribute('max', today);
    });
});

// --- STEP 0: Welcome Screen ---

document.getElementById('guestModeBtn').addEventListener('click', () => {
    document.getElementById('step-0-welcome').classList.add('hidden');
    document.getElementById('step-1-location').classList.remove('hidden');
    setTimeout(initFarmMap, 100); // Initialize map after unhiding container
});

document.getElementById('loginBtn').addEventListener('click', () => {
    document.getElementById('step-0-welcome').classList.add('hidden');
    document.getElementById('step-0-login').classList.remove('hidden');
});

document.getElementById('backToWelcomeBtn').addEventListener('click', () => {
    document.getElementById('step-0-login').classList.add('hidden');
    document.getElementById('step-0-welcome').classList.remove('hidden');
});

let farmerId = null;

document.getElementById('sendOtpBtn').addEventListener('click', async () => {
    const phone = document.getElementById('phoneInput').value;
    if (phone.length < 10) {
        showToast("Please enter a valid 10-digit mobile number.");
        return;
    }

    // Disable button for UX
    const btn = document.getElementById('sendOtpBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="icon">⏳</span> Sending...`;

    try {
        const response = await fetch('http://127.0.0.1:8000/api/v1/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone_number: "+91" + phone })
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();
        btn.innerHTML = `<span class="icon">✅</span> OTP Sent!`;

        // Show the backend response message (will indicate if real SMS or simulated)
        showToast(`+91 ${phone}: ${data.message}`);

        // Hide Send OTP, show Verify OTP
        setTimeout(() => {
            btn.classList.add('hidden');
            document.getElementById('otpSection').classList.remove('hidden');
        }, 1000);

    } catch (e) {
        console.error(e);
        btn.disabled = false;
        btn.innerHTML = `<span class="icon">✉️</span> Send OTP`;
        showToast("Failed to send OTP. Is the backend running?");
    }
});

document.getElementById('verifyOtpBtn').addEventListener('click', async () => {
    const phone = document.getElementById('phoneInput').value;
    const otpVal = document.getElementById('otpInput').value;

    if (otpVal.length < 4) {
        showToast("Please enter a valid 4-digit OTP.");
        return;
    }

    const btn = document.getElementById('verifyOtpBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="icon">⏳</span> Verifying...`;

    try {
        const response = await fetch('http://127.0.0.1:8000/api/v1/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone_number: "+91" + phone, otp: otpVal })
        });

        if (!response.ok) {
            showToast("Invalid OTP! Try '1234'");
            btn.disabled = false;
            btn.innerHTML = `<span class="icon">✅</span> Verify & Login`;
            return;
        }

        const data = await response.json();
        farmerId = data.farmer_id;
        localStorage.setItem("farmerId", farmerId);
        localStorage.setItem("farmerPhone", phone);

        // Show Success Toast
        showToast("Login Successful!", "success");

        // Clear Inputs
        document.getElementById('phoneInput').value = '';
        document.getElementById('otpInput').value = '';
        btn.innerHTML = `<span class="icon">✅</span> Verify & Login`; // Reset for next time
        btn.disabled = false;

        // Hide OTP section for next time
        document.getElementById('otpSection').classList.add('hidden');
        document.getElementById('sendOtpBtn').classList.remove('hidden');

        // Transition to Dashboard (Bypass manual location for logged in farmers)
        document.getElementById('step-0-login').classList.add('hidden');

        renderDashboard(data.fields);

    } catch (e) {
        console.error(e);
        btn.disabled = false;
        btn.innerHTML = `<span class="icon">✅</span> Verify & Login`;
        showToast("Failed to verify OTP.");
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const savedFarmerId = localStorage.getItem("farmerId");
    const savedPhone = localStorage.getItem("farmerPhone");

    if (savedFarmerId && savedPhone) {
        farmerId = parseInt(savedFarmerId);
        document.getElementById('step-0-welcome').classList.add('hidden');

        // Directly fetch fields if logged in previously
        fetch(`http://127.0.0.1:8000/api/v1/auth/farmer/${farmerId}/fields`)
            .then(res => {
                if (!res.ok) throw new Error("Invalid Session");
                return res.json();
            })
            .then(data => {
                renderDashboard(data.fields);
            })
            .catch(e => {
                console.error("Session fetch failed", e);
                localStorage.removeItem("farmerId");
                localStorage.removeItem("farmerPhone");
                document.getElementById('step-0-welcome').classList.remove('hidden');
            });
    }
});

// Function to render the dashboard UI
function renderDashboard(fields) {
    // Show Logout and Dashboard Buttons
    document.getElementById('logoutBtn').classList.remove('hidden');
    document.getElementById('navDashboardBtn').classList.remove('hidden');

    // Populate Dashboard UI
    document.getElementById('dash-phone').textContent = localStorage.getItem('farmerPhone');
    const fieldsContainer = document.getElementById('fieldsContainer');
    fieldsContainer.innerHTML = ''; // Clear existing

    const cropIcons = { wheat: '🌾', rice: '🌾', cotton: '☁️', sugarcane: '🎋', potato: '🥔', mustard: '🌼' };

    if (!fields || fields.length === 0) {
        fieldsContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); margin-bottom: 2rem;">No active crops. Add a field to begin tracking!</p>';
    } else {
        // Render a unique telemetry card for every active FarmField
        fields.forEach(field => {
            const cropIcon = cropIcons[field.crop] || '🌱';
            const sowDate = field.sowing_date ? new Date(field.sowing_date).toLocaleDateString() : 'Not Set';
            const totalIrrigations = field.total_irrigations || 0;
            const lastIrrigated = field.last_irrigation_date || 'None Recorded';

            const fieldHtml = `
                <div class="field-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.2rem; margin-bottom: 1.5rem;">
                    <h3 style="margin-top: 0; margin-bottom: 1rem; color: var(--primary); text-align: center;">${field.name}</h3>
                    <div class="grid" style="grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="data-card" style="padding: 0.8rem; text-align: center;">
                            <div class="data-label">Crop</div>
                            <div class="data-value" style="font-size: 1.8rem; margin-bottom: 0.2rem;">${cropIcon}</div>
                            <div class="data-value" style="font-size: 0.8rem; text-transform: capitalize;">${field.crop}</div>
                        </div>
                        <div class="data-card" style="padding: 0.8rem; text-align: center;">
                            <div class="data-label">Sown</div>
                            <div class="data-value" style="font-size: 1.8rem; margin-bottom: 0.2rem;">📅</div>
                            <div class="data-value" style="font-size: 0.8rem;">${sowDate}</div>
                        </div>
                        <div class="data-card" style="padding: 0.8rem; text-align: center;">
                            <div class="data-label">Soil</div>
                            <div class="data-value" style="font-size: 1.8rem; margin-bottom: 0.2rem;">🟤</div>
                            <div class="data-value" style="font-size: 0.8rem;">${field.soil_type || 'Unknown'}</div>
                        </div>
                    </div>
                    <div class="grid" style="grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="data-card view-history-btn" data-name="${field.name}" data-history='${JSON.stringify(field.irrigation_history || [])}' style="padding: 0.8rem; text-align: center; cursor: pointer; border: 1px dashed var(--primary); transition: 0.2s background;">
                            <div class="data-label" style="display: flex; justify-content: space-between; align-items: center;">Irrigations <span style="font-size:0.8rem;">🔍</span></div>
                            <div class="data-value" style="font-size: 1.8rem; margin-bottom: 0.2rem;">🔄</div>
                            <div class="data-value" style="font-size: 1rem;">${totalIrrigations}</div>
                        </div>
                        <div class="data-card" style="padding: 0.8rem; text-align: center;">
                            <div class="data-label">Last Irrigated</div>
                            <div class="data-value" style="font-size: 1.8rem; margin-bottom: 0.2rem;">💧</div>
                            <div class="data-value" style="font-size: 1rem;">${lastIrrigated}</div>
                        </div>
                    </div>
                    <button class="btn-primary view-history-btn" data-name="${field.name}" data-history='${JSON.stringify(field.irrigation_history || [])}' style="width: 100%; margin-bottom: 0.5rem; background-color: #3b82f6; border: none; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                        <span class="icon">📅</span> View Irrigation History
                    </button>
                    <div style="display: flex; gap: 0.5rem; justify-content: space-between;">
                        <button class="btn-secondary log-irrigation-btn" data-id="${field.id}" style="flex: 1; padding: 0.5rem; font-size: 0.8rem; border-color: rgba(59, 130, 246, 0.4);">
                            <span class="icon">➕</span> Log Irrigation
                        </button>
                        <button class="btn-secondary delete-field-btn" data-id="${field.id}" style="flex: 1; padding: 0.5rem; font-size: 0.8rem; border-color: rgba(239, 68, 68, 0.4); color: #ef4444;">
                            <span class="icon">🗑️</span> Delete Farm
                        </button>
                    </div>
                </div>
                `;
            fieldsContainer.insertAdjacentHTML('beforeend', fieldHtml);
        });
    }

    document.getElementById('step-0-dashboard').classList.remove('hidden');

    // Attach dynamic listeners
    document.querySelectorAll('.fetch-advisory-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            viewingSavedField = true;
            const target = e.currentTarget;
            target.disabled = true;
            target.innerHTML = `<span class="icon">⏳</span> Fetching Live Data...`;

            const fLat = target.getAttribute('data-lat');
            const fLon = target.getAttribute('data-lon');
            const fCrop = target.getAttribute('data-crop');
            const fSow = target.getAttribute('data-sow');
            let fLastIrri = target.getAttribute('data-last-irri');

            if (fLastIrri === 'None Recorded' || !fLastIrri) {
                fLastIrri = fSow; // Default back to sowing date if never watered
            }

            globalLat = fLat;
            globalLon = fLon;

            fetchWeatherAnalysis(fLat, fLon, fCrop, fSow, fLastIrri).then(() => {
                document.getElementById('step-0-dashboard').classList.add('hidden');
            }).catch(err => {
                console.error("Dashboard Analysis Error:", err);
                showToast("Failed to fetch Live Advisory data.");
            }).finally(() => {
                target.disabled = false;
                target.innerHTML = `<span class="icon">🤖</span> Smart Weather Advisory`;
            });
        });
    });

    // Add Delete Field Listeners
    const deleteFarmModal = document.getElementById('deleteFarmModal');

    document.querySelectorAll('.delete-field-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            deleteBtnTarget = e.currentTarget;
            currentFieldToDeleteId = deleteBtnTarget.getAttribute('data-id');
            deleteFarmModal.classList.remove('hidden');
        });
    });

    // Add Log Irrigation Listeners
    document.querySelectorAll('.log-irrigation-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentIrrigationFieldId = e.currentTarget.getAttribute('data-id');
            document.getElementById('irrigationModal').classList.remove('hidden');
        });
    });

    // Add View History Listeners
    const historyModal = document.getElementById('irrigationHistoryModal');
    const historyList = document.getElementById('historyListContainer');
    const historyCropNameEl = document.getElementById('historyModalCropName');

    document.querySelectorAll('.view-history-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const historyDataStr = target.getAttribute('data-history');
            const cropNameStr = target.getAttribute('data-name');
            const historyArr = JSON.parse(historyDataStr || "[]");

            if (historyCropNameEl) historyCropNameEl.textContent = cropNameStr || "Unknown Crop";

            historyList.innerHTML = ''; // Clear old rows

            if (historyArr.length === 0) {
                historyList.innerHTML = '<p style="text-align:center; color: var(--text-muted);">No irrigation events logged yet.</p>';
            } else {
                historyArr.forEach(ev => {
                    const rowHtml = `
                        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; border-left: 4px solid var(--primary);">
                            <div style="display: flex; align-items: center; gap: 0.8rem;">
                                <span style="font-size: 1.5rem;">💧</span>
                                <div>
                                    <div style="font-weight: 600; font-size: 0.95rem;">${formatDate(ev.date)}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-muted);">${ev.date}</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: bold; color: var(--primary); font-size: 1.1rem;">${ev.amount} mm</div>
                                <div style="font-size: 0.75rem; color: var(--text-muted);">Water Logged</div>
                            </div>
                        </div>
                    `;
                    historyList.insertAdjacentHTML('beforeend', rowHtml);
                });
            }

            historyModal.classList.remove('hidden');
        });
    });
}

// --- Dashboard Logic (Logged In Users) ---
document.getElementById('dashAddFieldBtn').addEventListener('click', () => {
    viewingSavedField = false;
    document.getElementById('step-0-dashboard').classList.add('hidden');
    // Clear old loc state so they can pick a new field map point
    globalLat = null;
    globalLon = null;
    document.getElementById('statusMessage').textContent = '';
    document.getElementById('step-1-location').classList.remove('hidden');
    setTimeout(initFarmMap, 100); // Initialize map after unhiding container
});

// --- Modal Action Listeners (Global) ---

const deleteFarmModal = document.getElementById('deleteFarmModal');

document.getElementById('cancelDeleteFarmBtn').addEventListener('click', () => {
    deleteFarmModal.classList.add('hidden');
    currentFieldToDeleteId = null;
    deleteBtnTarget = null;
});

document.getElementById('confirmDeleteFarmBtn').addEventListener('click', () => {
    if (!currentFieldToDeleteId) return;
    const target = deleteBtnTarget;

    target.disabled = true;
    target.innerHTML = "Deleting...";
    deleteFarmModal.classList.add('hidden');

    fetch(`http://127.0.0.1:8000/api/v1/auth/farmer/${farmerId}/fields/${currentFieldToDeleteId}`, {
        method: 'DELETE'
    }).then(res => {
        if (res.ok) window.location.reload();
        else showToast("Failed to delete field.");
    }).catch(err => {
        console.error(err);
        showToast("Network error.");
        target.disabled = false;
        target.innerHTML = `<span class="icon">🗑️</span> Delete Farm`;
    });
});

// Handle Custom Date Dropdown Toggle in Modal
const irrigateDropdownContainer = document.getElementById('irrigateDateDropdownContainer');
const irrigateSelected = document.getElementById('irrigateDateSelected');
const irrigateList = document.getElementById('irrigateDateList');
const irrigateText = document.getElementById('irrigateDateText');
const irrigateIcon = document.getElementById('irrigateDateIcon');
const irrigateValueInput = document.getElementById('irrigateDateValue');
const customIrrigateDateInput = document.getElementById('customIrrigateDate');

irrigateSelected.addEventListener('click', () => {
    irrigateList.classList.toggle('hidden');
});

// Handle Option Selection for Irrigation Modal
irrigateList.addEventListener('click', (e) => {
    const item = e.target.closest('.dropdown-item');
    if (item) {
        const value = item.getAttribute('data-value');
        const icon = item.getAttribute('data-icon');
        const text = item.textContent;

        irrigateText.textContent = text;
        irrigateIcon.textContent = icon;
        irrigateValueInput.value = value;

        irrigateList.querySelectorAll('.dropdown-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');

        irrigateList.classList.add('hidden');

        if (value === 'custom') {
            customIrrigateDateInput.classList.remove('hidden');
        } else {
            customIrrigateDateInput.classList.add('hidden');
        }
    }
});

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    if (!irrigateDropdownContainer.contains(e.target)) {
        irrigateList.classList.add('hidden');
    }
});

// Handle Cancel in Modal
document.getElementById('cancelIrrigationBtn').addEventListener('click', () => {
    document.getElementById('irrigationModal').classList.add('hidden');
    currentIrrigationFieldId = null;
});

// Close History Modal
document.getElementById('closeHistoryModalBtn').addEventListener('click', () => {
    document.getElementById('irrigationHistoryModal').classList.add('hidden');
});

// Handle Save in Modal
document.getElementById('confirmIrrigationBtn').addEventListener('click', () => {
    if (!currentIrrigationFieldId) return;

    const btn = document.getElementById('confirmIrrigationBtn');
    const amountStr = document.getElementById('irrigateAmountInput').value;
    const amount = parseFloat(amountStr) || 0;

    // Build Date
    const dateType = document.getElementById('irrigateDateValue').value;
    let submitDate = new Date();

    if (dateType === 'yesterday') {
        submitDate.setDate(submitDate.getDate() - 1);
    } else if (dateType === 'custom') {
        const customVal = document.getElementById('customIrrigateDate').value;
        if (customVal) {
            submitDate = new Date(customVal);
        }
    }

    const isoDate = submitDate.toISOString().split('T')[0];

    btn.disabled = true;
    btn.innerHTML = `Saving...`;

    fetch(`http://127.0.0.1:8000/api/v1/auth/farmer/${farmerId}/fields/${currentIrrigationFieldId}/irrigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            date: isoDate,
            irrigation_mm: amount
        })
    }).then(res => {
        if (res.ok) {
            document.getElementById('irrigationModal').classList.add('hidden');
            showToast("Irrigation successfully logged!");
            window.location.reload();
        } else {
            showToast("Failed to log irrigation.");
            btn.disabled = false;
            btn.innerHTML = `Save`;
        }
    }).catch(err => {
        console.error(err);
        showToast("Network error.");
        btn.disabled = false;
        btn.innerHTML = `Save`;
    });
});

// --- Dashboard Logic (Logged In Users) ---
document.getElementById('dashAddFieldBtn').addEventListener('click', () => {
    viewingSavedField = false;
    document.getElementById('step-0-dashboard').classList.add('hidden');
    // Clear old loc state so they can pick a new field map point
    globalLat = null;
    globalLon = null;
    document.getElementById('statusMessage').textContent = '';
    document.getElementById('step-1-location').classList.remove('hidden');
});

// --- Global Dashboard Navigation ---
document.getElementById('navDashboardBtn').addEventListener('click', () => {
    // Escaping from any deeper flow (Location, details, or results)
    document.getElementById('step-1-location').classList.add('hidden');
    document.getElementById('step-2-details').classList.add('hidden');
    document.getElementById('results-container').classList.add('hidden');

    // Show Dashboard
    document.getElementById('step-0-dashboard').classList.remove('hidden');
});

// --- Logout Logic ---
document.getElementById('logoutBtn').addEventListener('click', () => {
    farmerId = null;
    localStorage.removeItem("farmerId");
    localStorage.removeItem("farmerPhone");
    window.location.reload();
});

// --- STEP 1: Farm Boundary Map Handling ---

let farmMap = null;
let mapMarkers = [];
let mapPolygon = null;
let currentGeoJson = null;

function initFarmMap() {
    if (farmMap !== null) {
        farmMap.invalidateSize(); // Fix gray map issue if already initialized
        return;
    }

    farmMap = L.map('farmMapContainer', { zoomControl: false, maxZoom: 22 }).setView([30.9, 75.8], 15);

    // Zoom control at top right so it doesn't block the Locate button
    L.control.zoom({ position: 'topright' }).addTo(farmMap);

    // Note: Esri World Imagery maxZoom is usually 19 natively, but we can set maxNativeZoom to 19 and maxZoom to 22 to allow digital magnification
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxNativeZoom: 19,
        maxZoom: 22
    }).addTo(farmMap);

    L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxNativeZoom: 19,
        maxZoom: 22,
        opacity: 0.7
    }).addTo(farmMap);

    farmMap.on('click', function (e) {
        addMapMarker(e.latlng);
    });
}

function addMapMarker(latlng) {
    const marker = L.marker(latlng, { draggable: true }).addTo(farmMap);
    marker.on('drag', updateMapPolygon);
    mapMarkers.push(marker);
    updateMapPolygon();
}

function updateMapPolygon() {
    const latlngs = mapMarkers.map(m => m.getLatLng());

    if (mapPolygon) farmMap.removeLayer(mapPolygon);

    if (latlngs.length >= 3) {
        mapPolygon = L.polygon(latlngs, {
            color: '#10B981',
            fillColor: '#34d399',
            fillOpacity: 0.4,
            weight: 3,
            dashArray: '5, 5'
        }).addTo(farmMap);

        calculateMapArea(latlngs);
        document.getElementById('mapConfirmBtn').disabled = false;
    } else {
        document.getElementById('mapAreaAcres').innerText = "0.00";
        document.getElementById('mapConfirmBtn').disabled = true;
    }
}

function calculateMapArea(latlngs) {
    const R = 6378137;
    let area = 0;

    if (latlngs.length > 2) {
        for (let i = 0; i < latlngs.length; i++) {
            let p1 = latlngs[i];
            let p2 = latlngs[(i + 1) % latlngs.length];
            let p1Lat = p1.lat * Math.PI / 180;
            let p2Lat = p2.lat * Math.PI / 180;
            area += (p2.lng - p1.lng) * Math.PI / 180 * (2 + Math.sin(p1Lat) + Math.sin(p2Lat));
        }
        area = Math.abs(area * R * R / 2.0);
    }

    const acres = area * 0.000247105;
    document.getElementById('mapAreaAcres').innerText = acres.toFixed(2);
}

document.getElementById('mapClearBtn').addEventListener('click', () => {
    mapMarkers.forEach(m => farmMap.removeLayer(m));
    if (mapPolygon) farmMap.removeLayer(mapPolygon);
    mapMarkers = [];
    mapPolygon = null;
    updateMapPolygon();
});

document.getElementById('mapLocateBtn').addEventListener('click', () => {
    const btn = document.getElementById('mapLocateBtn');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = "<span>⏳</span> Locating...";

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                // Fly to extreme close-up using digital magnification zoom 22
                farmMap.flyTo([lat, lng], 22, { animate: true, duration: 1.5 });

                L.circleMarker([lat, lng], {
                    radius: 8, fillColor: "#3b82f6", color: "#ffffff", weight: 2, opacity: 1, fillOpacity: 0.9
                }).addTo(farmMap);

                btn.innerHTML = oldHtml;
            },
            () => { alert("⚠️ Please allow Location access."); btn.innerHTML = oldHtml; },
            { enableHighAccuracy: true }
        );
    }
});

document.getElementById('mapConfirmBtn').addEventListener('click', () => {
    if (mapMarkers.length < 3) return;

    // Calculate the center of the polygon to use as the Global Lat/Lon for Open-Meteo & Weather APIs
    const bounds = mapPolygon.getBounds();
    const center = bounds.getCenter();
    globalLat = center.lat;
    globalLon = center.lng;

    // Build the finalized GeoJSON Payload
    const coordinates = mapMarkers.map(m => {
        const ll = m.getLatLng();
        return [ll.lat, ll.lng];
    });
    coordinates.push(coordinates[0]);

    const acresFloat = parseFloat(document.getElementById('mapAreaAcres').innerText);

    currentGeoJson = {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [coordinates] },
        properties: {
            area_acres: acresFloat,
            area_killa: acresFloat, // 1 Acre = 1 Killa in Punjab
            timestamp: new Date().toISOString()
        }
    };

    // Save GeoJSON to backend immediately if farmer is logged in. 
    // Otherwise hold it in memory.
    if (farmerId && currentGeoJson) {
        fetch('/api/v1/gis/save-boundary?farmer_id=' + farmerId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentGeoJson)
        }).catch(e => console.error("GeoJSON sync failed", e));
    }

    moveToStep2();
});

document.getElementById('closeMapOverlayBtn').addEventListener('click', () => {
    document.getElementById('step-1-location').classList.add('hidden');
    if (farmerId) {
        document.getElementById('step-0-dashboard').classList.remove('hidden');
    } else {
        document.getElementById('step-0-welcome').classList.remove('hidden');
    }
});

// --- UI Transitions ---

function moveToStep2() {
    document.getElementById('step-1-location').classList.add('hidden');
    document.getElementById('step-2-details').classList.remove('hidden');

    // Default sowing date to today
    const today = new Date().toISOString().split('T')[0];
    if (!document.getElementById('sowingDate').value) {
        document.getElementById('sowingDate').value = today;
    }
}

// --- Custom Crop Dropdown Logic ---

function setupCustomDropdown(containerId, selectedBoxId, listId, hiddenInputId, onSelectCallback = null) {
    const container = document.getElementById(containerId);
    const selectedBox = document.getElementById(selectedBoxId);
    const optionsList = document.getElementById(listId);
    const hiddenInput = document.getElementById(hiddenInputId);

    // Toggle Dropdown
    selectedBox.addEventListener('click', () => {
        optionsList.classList.toggle('hidden');
        container.classList.toggle('active');
    });

    // Select Item
    optionsList.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Clear old selected
            optionsList.querySelectorAll('.dropdown-item.selected').forEach(el => el.classList.remove('selected'));

            // Mark new selected
            item.classList.add('selected');

            // Update hidden input value
            const val = item.getAttribute('data-value');
            hiddenInput.value = val;

            // Update UI Text & Icon
            const text = item.textContent;
            const icon = item.getAttribute('data-icon');
            // Check if the selectedBox has a .crop-text and .crop-icon, as not all dropdowns might have them
            const cropTextElement = selectedBox.querySelector('.crop-text');
            const cropIconElement = selectedBox.querySelector('.crop-icon');
            if (cropTextElement) cropTextElement.textContent = text;
            if (cropIconElement) cropIconElement.textContent = icon;

            // Close dropdown
            optionsList.classList.add('hidden');
            container.classList.remove('active');

            if (onSelectCallback) onSelectCallback(val);
        });
    });

    // Close outside click
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            optionsList.classList.add('hidden');
            container.classList.remove('active');
        }
    });
}

// Initialize the 3 dropdowns
setupCustomDropdown('cropDropdownContainer', 'cropSelected', 'cropList', 'cropSelect');

setupCustomDropdown('sowingDropdownContainer', 'sowingSelected', 'sowingList', 'sowingDropdown', (val) => {
    const customWrapper = document.getElementById('customSowingDateWrapper');
    if (val === 'custom') {
        customWrapper.classList.remove('hidden');
    } else {
        customWrapper.classList.add('hidden');
    }
});

setupCustomDropdown('irrigationDropdownContainer', 'irrigationSelected', 'irrigationList', 'irrigationDropdown', (val) => {
    const customWrapper = document.getElementById('customIrrigationDateWrapper');
    if (val === 'custom') {
        customWrapper.classList.remove('hidden');
    } else {
        customWrapper.classList.add('hidden');
    }
});

// --- STEP 2: Crop Details & API Calling ---

function calculatePastDate(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
}

document.getElementById('getRecommendationBtn').addEventListener('click', () => {
    const crop = document.getElementById('cropSelect').value;

    // Parse Sowing Date
    const sowingDropdownVal = document.getElementById('sowingDropdown').value;
    let sowingDateParsed = "";
    if (sowingDropdownVal === 'this_month') sowingDateParsed = calculatePastDate(15);
    else if (sowingDropdownVal === '1_month') sowingDateParsed = calculatePastDate(30);
    else if (sowingDropdownVal === '2_months') sowingDateParsed = calculatePastDate(60);
    else if (sowingDropdownVal === '3_months') sowingDateParsed = calculatePastDate(90);
    else sowingDateParsed = document.getElementById('sowingDate').value;

    // Parse Irrigation Date
    const irriDropdownVal = document.getElementById('irrigationDropdown').value;
    let lastIrriDate = "";

    if (irriDropdownVal === '1_week') lastIrriDate = calculatePastDate(7);
    else if (irriDropdownVal === '2_weeks') lastIrriDate = calculatePastDate(14);
    else lastIrriDate = document.getElementById('lastIrrigationDate').value;

    const btn = document.getElementById('getRecommendationBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="icon">⏳</span> Processing ET Model...`;

    globalLastIrriDate = lastIrriDate;

    fetchWeatherAnalysis(globalLat, globalLon, crop, sowingDateParsed, lastIrriDate).finally(() => {
        btn.disabled = false;
        btn.innerHTML = `<span class="icon">🚀</span> Get Smart Recommendation`;
    });
});

document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('results-container').classList.add('hidden');
    document.getElementById('step-1-location').classList.remove('hidden');
    globalLat = null;
    globalLon = null;

    // Reset buttons and statuses
    const btn = document.getElementById('getLocationBtn');
    btn.disabled = false;
    btn.innerHTML = `<span class="icon">📍</span> Analyze My Location`;
    document.getElementById('statusMessage').textContent = "";
});

async function fetchWeatherAnalysis(lat, lon, crop, sowingDate, lastIrriDate) {
    const statusMsg = document.getElementById('step2Status');
    statusMsg.textContent = "Analyzing climate data...";
    statusMsg.className = "status-msg";

    try {
        const payload = {
            latitude: lat,
            longitude: lon,
            crop: crop || 'wheat',
            sowing_date: sowingDate || '',
            last_irrigation_date: lastIrriDate || ''
        };

        const response = await fetch('http://127.0.0.1:8000/api/v1/weather-analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Final transition
        document.getElementById('step-2-details').classList.add('hidden');
        document.getElementById('results-container').classList.remove('hidden');

        displayResults(data);

        // --- Dynamic Guest CTA & Save Field Toggles ---
        const guestCta = document.getElementById('guestCtaBanner');
        const saveBtn = document.getElementById('saveFieldBtn');

        if (farmerId) {
            guestCta.classList.add('hidden');

            // If they just formulated a new field, show the Save button
            if (!viewingSavedField) {
                saveBtn.classList.remove('hidden');
            } else {
                saveBtn.classList.add('hidden');
            }
        } else {
            guestCta.classList.remove('hidden');
            saveBtn.classList.add('hidden');
        }

    } catch (error) {
        console.error('Error:', error);
        statusMsg.textContent = "Failed to connect to the analysis engine. Ensure backend is running.";
        statusMsg.className = "status-msg error";
    }
}

// --- Wire up Guest CTA Login Button ---
document.getElementById('guestToLoginBtn').addEventListener('click', () => {
    document.getElementById('results-container').classList.add('hidden');
    document.getElementById('step-0-login').classList.remove('hidden');
});

// --- Wire up Save Field Button ---
document.getElementById('saveFieldBtn').addEventListener('click', () => {
    const btn = document.getElementById('saveFieldBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="icon">⏳</span> Saving to Dashboard...`;

    const fCrop = document.getElementById('cropSelect').value || 'wheat';
    const fSow = document.getElementById('sowingDate').value || null;
    const initialIrriAmount = parseFloat(document.getElementById('initialIrrigAmount').value) || 0;

    fetch(`http://127.0.0.1:8000/api/v1/auth/farmer/${farmerId}/add-field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            field_name: `${fCrop.charAt(0).toUpperCase() + fCrop.slice(1)} Plot`,
            lat: parseFloat(globalLat),
            lon: parseFloat(globalLon),
            crop: fCrop,
            sowing_date: fSow,
            last_irrigation_date: globalLastIrriDate || null,
            initial_irrigation_mm: initialIrriAmount
        })
    }).then(res => {
        if (res.ok) {
            showToast("Field registered to Dashboard!");
            window.location.reload();
        } else {
            showToast("Failed to save field to DB.");
            btn.disabled = false;
        }
    }).catch(e => {
        console.error("Save Field Error:", e);
        btn.disabled = false;
    });
});

function displayResults(data) {
    // document.getElementById('location-card').classList.add('hidden'); // This line is no longer needed here
    // document.getElementById('results-container').classList.remove('hidden'); // This line is no longer needed here

    // Basic texts
    document.getElementById('res-location').textContent = data.location;
    document.getElementById('res-rain-prob').textContent = data.rain_probability_next_3_days;
    document.getElementById('res-next-rain').textContent = data.next_rain_expected_on ? formatDate(data.next_rain_expected_on) : "No Rain Expected";
    document.getElementById('res-max-temp').textContent = `${data.max_temperature_next_7_days}°C`;

    // Check if Soil Type Display exists, update if present
    const soilTypeEl = document.getElementById('res-soil-type');
    if (soilTypeEl) {
        soilTypeEl.textContent = data.soil_type || 'Unknown';
    }

    // Heat Risk Badge
    const riskBadge = document.getElementById('res-heat-risk');
    const riskLevel = data.heat_stress_risk.level;
    riskBadge.textContent = riskLevel;

    document.getElementById('res-heat-limit').textContent = `Limits Used: >${data.heat_stress_risk.threshold_used}°C`;

    if (riskLevel === "Low") {
        riskBadge.style.backgroundColor = "rgba(16, 185, 129, 0.2)";
        riskBadge.style.color = "#10B981";
    } else if (riskLevel === "Moderate") {
        riskBadge.style.backgroundColor = "rgba(245, 158, 11, 0.2)";
        riskBadge.style.color = "#F59E0B";
    } else {
        riskBadge.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
        riskBadge.style.color = "#EF4444";
    }

    // Irrigation 
    const isRequired = data.irrigation_recommendation.required;
    const irriBox = document.getElementById('irrigation-box');
    const irriReq = document.getElementById('res-irri-req');
    const irriReason = document.getElementById('res-irri-reason');

    irriReason.textContent = data.irrigation_recommendation.reason;

    if (isRequired) {
        irriReq.textContent = "Action Required: Irrigate Crop";
        irriReq.style.color = "#EF4444";
        irriBox.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
        irriBox.style.borderColor = "rgba(239, 68, 68, 0.2)";
    } else {
        irriReq.textContent = "No Immediate Irrigation";
        irriReq.style.color = "#10B981";
        irriBox.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
        irriBox.style.borderColor = "rgba(16, 185, 129, 0.2)";
    }
}

function formatDate(dateString) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', options);
}

// --- Global Toast Notification ---
function showToast(message, type = "error") {
    const toast = document.getElementById('customToast');
    const msgEl = document.getElementById('toastMessage');
    const iconEl = document.getElementById('toastIcon');

    // Strip quotes if passed as string literal
    msgEl.textContent = message.replace(/^["']|["']$/g, '');

    if (type === "success") {
        toast.style.background = "var(--primary)";
        toast.style.borderColor = "rgba(16, 185, 129, 0.5)";
        iconEl.textContent = "✅";
    } else if (type === "info") {
        toast.style.background = "#3B82F6";
        toast.style.borderColor = "rgba(59, 130, 246, 0.5)";
        iconEl.textContent = "ℹ️";
    } else {
        toast.style.background = "#EF4444";
        toast.style.borderColor = "rgba(239, 68, 68, 0.5)";
        iconEl.textContent = "⚠️";
    }

    toast.classList.add('show');
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 4000);
}
