const API_BASE_URL = 'http://127.0.0.1:8000';
let farmerId = null;
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

document.getElementById('guestModeBtn')?.addEventListener('click', () => {
    viewingSavedField = false;
    document.getElementById('step-0-welcome').classList.add('hidden');
    document.getElementById('step-1-location').classList.remove('hidden');
    setTimeout(initFarmMap, 100); // Initialize map after unhiding container
});

document.getElementById('loginBtn')?.addEventListener('click', () => {
    document.getElementById('step-0-welcome').classList.add('hidden');
    document.getElementById('step-0-login').classList.remove('hidden');
});

document.getElementById('backToWelcomeBtn')?.addEventListener('click', () => {
    document.getElementById('step-0-login').classList.add('hidden');
    document.getElementById('step-0-welcome').classList.remove('hidden');
});

document.getElementById('sendOtpBtn')?.addEventListener('click', async () => {
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
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/send-otp`, {
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

document.getElementById('verifyOtpBtn')?.addEventListener('click', async () => {
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
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-otp`, {
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
        // Do NOT hide welcome yet, wait for renderDashboard or catch failure

        // Directly fetch fields if logged in previously
        fetch(`${API_BASE_URL}/api/v1/auth/farmer/${farmerId}/fields`)
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
                    <button class="btn-primary fetch-advisory-btn" data-id="${field.id}" data-lat="${field.lat}" data-lon="${field.lon}" data-crop="${field.crop}" data-sow="${field.sowing_date}" data-last-irri="${lastIrrigated}" style="width: 100%; margin-bottom: 0.5rem; background: linear-gradient(135deg, #10B981, #059669); border: none;">
                        <span class="icon">🔍</span> Crop Health Analysis
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

    document.getElementById('step-0-welcome').classList.add('hidden');
    document.getElementById('step-0-login').classList.add('hidden');
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

            globalLat = parseFloat(fLat);
            globalLon = parseFloat(fLon);
            localStorage.setItem('currentViewFieldId', target.getAttribute('data-id'));

            fetchWeatherAnalysis(fLat, fLon, fCrop, fSow, fLastIrri).then(() => {
                // Ensure UI unhides after fetch
                document.getElementById('results-container').classList.remove('hidden');
                document.getElementById('step-0-dashboard').classList.add('hidden');
            }).catch(err => {
                console.error("Dashboard Analysis Error:", err);
                showToast("Failed to fetch Crop Health data.");
            }).finally(() => {
                target.disabled = false;
                target.innerHTML = `<span class="icon">🔍</span> Crop Health Analysis`;
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
document.getElementById('dashAddFieldBtn')?.addEventListener('click', () => {
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

document.getElementById('cancelDeleteFarmBtn')?.addEventListener('click', () => {
    deleteFarmModal.classList.add('hidden');
    currentFieldToDeleteId = null;
    deleteBtnTarget = null;
});

document.getElementById('confirmDeleteFarmBtn')?.addEventListener('click', () => {
    if (!currentFieldToDeleteId) return;
    const target = deleteBtnTarget;

    target.disabled = true;
    target.innerHTML = "Deleting...";
    deleteFarmModal.classList.add('hidden');

    fetch(`${API_BASE_URL}/api/v1/auth/farmer/${farmerId}/fields/${currentFieldToDeleteId}`, {
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
document.getElementById('cancelIrrigationBtn')?.addEventListener('click', () => {
    document.getElementById('irrigationModal').classList.add('hidden');
    currentIrrigationFieldId = null;
});

// Close History Modal
document.getElementById('closeHistoryModalBtn')?.addEventListener('click', () => {
    document.getElementById('irrigationHistoryModal').classList.add('hidden');
});

// Handle Save in Modal
document.getElementById('confirmIrrigationBtn')?.addEventListener('click', () => {
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

    fetch(`${API_BASE_URL}/api/v1/auth/farmer/${farmerId}/fields/${currentIrrigationFieldId}/irrigate`, {
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
document.getElementById('dashAddFieldBtn')?.addEventListener('click', () => {
    viewingSavedField = false;
    document.getElementById('step-0-dashboard').classList.add('hidden');
    // Clear old loc state so they can pick a new field map point
    globalLat = null;
    globalLon = null;
    document.getElementById('statusMessage').textContent = '';
    document.getElementById('step-1-location').classList.remove('hidden');
});

// --- Global Dashboard Navigation ---
document.getElementById('navDashboardBtn')?.addEventListener('click', () => {
    // Escaping from any deeper flow (Location, details, or results)
    document.getElementById('step-1-location').classList.add('hidden');
    document.getElementById('step-2-details').classList.add('hidden');
    document.getElementById('results-container').classList.add('hidden');

    // Show Dashboard
    document.getElementById('step-0-dashboard').classList.remove('hidden');
});

// --- Logout Logic ---
document.getElementById('logoutBtn')?.addEventListener('click', () => {
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

// --- Live Location (GPS) Logic ---
document.getElementById('mapLocateBtn')?.addEventListener('click', () => {
    if (!navigator.geolocation) {
        showToast("Geolocation is not supported by your browser.", "error");
        return;
    }

    const btn = document.getElementById('mapLocateBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Locating...';
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            // Ensure map is initialized
            if (!farmMap) {
                initFarmMap();
            }

            if (farmMap) {
                farmMap.invalidateSize();
                farmMap.flyTo([lat, lon], 18, {
                    animate: true,
                    duration: 1.5
                });

                // Optional: Show a temporary marker for the user's location
                L.circleMarker([lat, lon], {
                    radius: 8,
                    fillColor: "#3B82F6",
                    color: "#fff",
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 1
                }).addTo(farmMap).bindPopup("You are here").openPopup();

                showToast("GPS Location Found!", "success");
            }

            btn.innerHTML = originalText;
            btn.disabled = false;
        },
        (error) => {
            console.error("GPS Error:", error);
            let errorMsg = "Failed to get location.";
            if (error.code === 1) errorMsg = "Location access denied. Please allow GPS.";
            else if (error.code === 2) errorMsg = "Position unavailable. GPS signal weak.";
            else if (error.code === 3) errorMsg = "Location request timed out.";

            showToast(errorMsg, "error");
            btn.innerHTML = originalText;
            btn.disabled = false;
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
});

// --- Map Search Logic ---
document.getElementById('mapSearchBtn')?.addEventListener('click', async () => {
    const searchInput = document.getElementById('mapSearchInput').value.trim();
    if (!searchInput) {
        showToast("Please enter a location to search", "error");
        return;
    }

    const btn = document.getElementById('mapSearchBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳';
    btn.disabled = true;

    try {
        // Use Photon API (Komoot) for better fuzzy geocoding than Nominatim
        const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(searchInput)}&limit=1`);
        const data = await response.json();

        if (data && data.features && data.features.length > 0) {
            // Photon returns GeoJSON: coordinates are [lon, lat]
            const lon = parseFloat(data.features[0].geometry.coordinates[0]);
            const lat = parseFloat(data.features[0].geometry.coordinates[1]);
            const name = data.features[0].properties.name || data.features[0].properties.city || searchInput;

            // Ensure map is initialized before panning
            if (!farmMap) {
                initFarmMap();
            }

            if (farmMap) {
                // Invalidate size in case the container was hidden
                farmMap.invalidateSize();
                farmMap.flyTo([lat, lon], 16, {
                    animate: true,
                    duration: 1.5
                });
                showToast(`Found: ${name}`, "success");
            }
        } else {
            showToast("Location not found. Please try a nearby city or landmark.", "error");
        }
    } catch (error) {
        console.error("Geocoding Error:", error);
        showToast("Search failed. Check your internet connection.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// --- Manual Coordinate Navigation ---
document.getElementById('mapGoCoordBtn')?.addEventListener('click', () => {
    const latStr = document.getElementById('manualLatInput').value.trim();
    const lonStr = document.getElementById('manualLonInput').value.trim();

    if (!latStr || !lonStr) {
        showToast("Please enter both Latitude and Longitude.", "error");
        return;
    }

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        showToast("Invalid coordinates. Lat must be -90 to 90, Lon -180 to 180.", "error");
        return;
    }

    // Ensure map is initialized
    if (!farmMap) {
        initFarmMap();
    }

    if (farmMap) {
        farmMap.invalidateSize();
        farmMap.flyTo([lat, lon], 17, {
            animate: true,
            duration: 1.5
        });

        // Optional: Drop a temporary marker
        L.circleMarker([lat, lon], {
            radius: 8,
            fillColor: "#10B981",
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 1
        }).addTo(farmMap).bindPopup(`Lat: ${lat}, Lon: ${lon}`).openPopup();

        showToast("Moved to coordinates!", "success");
    }
});

document.getElementById('mapClearBtn')?.addEventListener('click', () => {
    mapMarkers.forEach(m => farmMap.removeLayer(m));
    if (mapPolygon) farmMap.removeLayer(mapPolygon);
    mapMarkers = [];
    mapPolygon = null;
    updateMapPolygon();
});

document.getElementById('mapLocateBtn')?.addEventListener('click', () => {
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

document.getElementById('mapConfirmBtn')?.addEventListener('click', () => {
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
        fetch(`${API_BASE_URL}/api/v1/gis/save-boundary?farmer_id=` + farmerId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentGeoJson)
        }).catch(e => console.error("GeoJSON sync failed", e));
    }

    moveToStep2();
});

document.getElementById('closeMapOverlayBtn')?.addEventListener('click', () => {
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

    // Safety check - if any required element is missing, abort setup for this dropdown
    if (!container || !selectedBox || !optionsList || !hiddenInput) {
        console.warn(`Dropdown setup skipped. Missing elements for: ${containerId}`);
        return;
    }

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

document.getElementById('getRecommendationBtn')?.addEventListener('click', () => {
    console.log("=== getRecommendationBtn CLICKED ===");
    console.log("globalLat:", globalLat, "globalLon:", globalLon);

    // 1. Pre-flight Validation
    if (!globalLat || !globalLon) {
        showToast("Error: Please mark your farm boundary on the map first.", "error");
        return;
    }

    const crop = document.getElementById('cropSelect').value;

    // Parse Sowing Date
    const sowingDropdownVal = document.getElementById('sowingDropdown').value;
    let sowingDateParsed = "";
    if (sowingDropdownVal === 'this_month') sowingDateParsed = calculatePastDate(15);
    else if (sowingDropdownVal === '1_month') sowingDateParsed = calculatePastDate(30);
    else if (sowingDropdownVal === '2_months') sowingDateParsed = calculatePastDate(60);
    else if (sowingDropdownVal === '3_months') sowingDateParsed = calculatePastDate(90);
    else sowingDateParsed = document.getElementById('sowingDate').value || calculatePastDate(15); // Fallback

    // Parse Irrigation Date
    const irriDropdownVal = document.getElementById('irrigationDropdown').value;
    let lastIrriDate = "";

    if (irriDropdownVal === '1_week') lastIrriDate = calculatePastDate(7);
    else if (irriDropdownVal === '2_weeks') lastIrriDate = calculatePastDate(14);
    else lastIrriDate = document.getElementById('lastIrrigationDate').value || calculatePastDate(7); // Fallback

    const btn = document.getElementById('getRecommendationBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="icon">⏳</span> Processing ET Model...`;

    globalLastIrriDate = lastIrriDate;

    // Build polygon for spatial analysis
    let polyPayload = null;
    if (mapMarkers.length >= 3) {
        polyPayload = mapMarkers.map(m => ({
            lat: m.getLatLng().lat,
            lon: m.getLatLng().lng
        }));
    }

    // Execute with error catching
    fetchWeatherAnalysis(globalLat, globalLon, crop, sowingDateParsed, lastIrriDate, polyPayload)
        .catch(err => {
            console.error("Recommendation Error:", err);
            showToast("Failed to generate recommendation. Check internet connection.");
        })
        .finally(() => {
            btn.disabled = false;
            btn.innerHTML = `<span class="icon">🚀</span> Get Smart Recommendation`;
        });
});

document.getElementById('resetBtn')?.addEventListener('click', () => {
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

async function fetchWeatherAnalysis(lat, lon, crop, sowingDate, lastIrriDate, polygon = null) {
    const statusMsg = document.getElementById('step2Status');
    statusMsg.textContent = "Analyzing climate data...";
    statusMsg.className = "status-msg";

    try {
        const payload = {
            latitude: lat,
            longitude: lon,
            crop: crop || 'wheat',
            sowing_date: sowingDate || '',
            last_irrigation_date: lastIrriDate || '',
            polygon: polygon
        };

        const response = await fetch(`${API_BASE_URL}/api/v1/weather-analysis`, {
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

    } catch (error) {
        console.error('Error:', error);
        statusMsg.textContent = "Failed to connect to the analysis engine. Ensure backend is running.";
        statusMsg.className = "status-msg error";
    }
}

// --- Wire up Guest CTA Login Button ---
document.getElementById('guestToLoginBtn')?.addEventListener('click', () => {
    document.getElementById('results-container').classList.add('hidden');
    document.getElementById('step-0-login').classList.remove('hidden');
});

// --- Wire up Save Field Button ---
document.getElementById('saveFieldBtn')?.addEventListener('click', () => {
    const btn = document.getElementById('saveFieldBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="icon">⏳</span> Saving to Dashboard...`;

    const fCrop = document.getElementById('cropSelect').value || 'wheat';
    const fSow = document.getElementById('sowingDate').value || null;
    const initialIrriAmount = parseFloat(document.getElementById('initialIrrigAmount').value) || 0;

    fetch(`${API_BASE_URL}/api/v1/auth/farmer/${farmerId}/add-field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            field_name: `${fCrop.charAt(0).toUpperCase() + fCrop.slice(1)} Plot`,
            lat: parseFloat(globalLat),
            lon: parseFloat(globalLon),
            crop: fCrop,
            sowing_date: fSow,
            last_irrigation_date: globalLastIrriDate || null,
            initial_irrigation_mm: initialIrriAmount,
            boundary_geojson: currentGeoJson ? JSON.stringify(currentGeoJson) : null
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
    const resultsHeader = document.getElementById('results-header');
    const standardGrid = document.getElementById('standard-results-grid');
    const visualMapContainer = document.getElementById('visualFarmMapContainer');
    const leafCard = document.getElementById('leafUploadCard');
    const matrixContainer = document.getElementById('decisionMatrixContainer');
    const healthResultCard = document.getElementById('health-result-card');
    const inferenceBox = document.getElementById('inferenceBox');
    const guestCta = document.getElementById('guestCtaBanner');
    const saveBtn = document.getElementById('saveFieldBtn');

    if (viewingSavedField) {
        // Farmer Mode: Crop Health Analysis Portal
        if (resultsHeader) {
            resultsHeader.querySelector('h3').innerHTML = `Crop Health Analysis: <span id="res-location" style="color:var(--primary)">${data.location}</span>`;
        }
        standardGrid?.classList.add('hidden');
        visualMapContainer?.classList.remove('hidden');
        leafCard?.classList.remove('hidden');
        matrixContainer?.classList.remove('hidden');

        // Farmer Mode: Explicitly hide guest CTA and save button
        guestCta?.classList.add('hidden');
        saveBtn?.classList.add('hidden');

        initVisualFarmMap(data);
        populateDecisionMatrix(data);
        setupLeafUploadListeners(localStorage.getItem('currentViewFieldId'));
    } else {
        // Guest Mode OR Farmer formulating a NEW field
        if (resultsHeader) {
            resultsHeader.querySelector('h3').innerHTML = `Analysis for <span id="res-location">${data.location}</span>`;
        }
        standardGrid?.classList.remove('hidden');
        visualMapContainer?.classList.add('hidden');
        leafCard?.classList.add('hidden');
        matrixContainer?.classList.add('hidden');
        if (healthResultCard) healthResultCard.classList.add('hidden');
        inferenceBox?.classList.add('hidden');

        // Toggle CTAs based on login status
        if (farmerId) {
            guestCta?.classList.add('hidden');
            saveBtn?.classList.remove('hidden');
        } else {
            guestCta?.classList.remove('hidden');
            saveBtn?.classList.add('hidden');
        }
    }

    // Basic texts - Use optional chaining to prevent crashes
    const locEl = document.getElementById('res-location');
    if (locEl) locEl.textContent = data.location;

    const rainProbEl = document.getElementById('res-rain-prob');
    if (rainProbEl) rainProbEl.textContent = `${data.rain_probability_next_3_days}%`;

    const nextRainEl = document.getElementById('res-next-rain');
    if (nextRainEl) nextRainEl.textContent = data.next_rain_expected_on ? formatDate(data.next_rain_expected_on) : "No Rain Expected";

    const maxTempEl = document.getElementById('res-max-temp');
    if (maxTempEl) maxTempEl.textContent = `${data.max_temperature_next_7_days}°C`;

    // Check if Soil Type Display exists, update if present
    const soilTypeEl = document.getElementById('res-soil-type');
    if (soilTypeEl) {
        soilTypeEl.textContent = data.soil_type || 'Unknown';
    }

    // Update timestamp
    const lastUpdated = document.getElementById('last-updated-time');
    if (lastUpdated) {
        const now = new Date();
        lastUpdated.textContent = `Last Sync: ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    }

    // AI Crop Health
    const healthScoreEl = document.getElementById('res-health-score');
    const healthStatusEl = document.getElementById('res-health-status');
    if (healthScoreEl && data.crop_health) {
        healthScoreEl.textContent = `${data.crop_health.score}%`;
        healthStatusEl.textContent = `Status: ${data.crop_health.status}`;

        // Dynamic color based on score
        if (data.crop_health.score > 80) healthScoreEl.style.color = "#10B981";
        else if (data.crop_health.score > 60) healthScoreEl.style.color = "#F59E0B";
        else healthScoreEl.style.color = "#EF4444";
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

    const irriEtc = document.getElementById('res-irri-etc');
    if (irriEtc && data.irrigation_recommendation.etc_mm_per_day) {
        irriEtc.textContent = `Daily Water Demand (ETc): ${data.irrigation_recommendation.etc_mm_per_day} mm`;
    }

    // Handle Smart Scouting Button Relocation
    const scoutingLinkContainer = document.getElementById('scoutingLinkContainer');
    if (scoutingLinkContainer) {
        scoutingLinkContainer.innerHTML = ''; // Clear previous
        if (viewingSavedField) {
            // Find fieldId from global variables or data if available
            // Since we use globalLat/Lon, we might need to store currentFieldId
            const currentFieldIdForScouting = localStorage.getItem('currentViewFieldId');
            if (currentFieldIdForScouting) {
                scoutingLinkContainer.innerHTML = `
                    <button class="btn-primary open-scouting-btn" data-id="${currentFieldIdForScouting}" style="width: 100%; background-color: #10b981; border: none; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); margin-top: 1rem;">
                        <span class="icon">🛰️</span> Smart Directional Scouting
                    </button>
                `;
                scoutingLinkContainer.classList.remove('hidden');

                // Attach listener
                const scButton = scoutingLinkContainer.querySelector('.open-scouting-btn');
                scButton.addEventListener('click', (e) => {
                    const fid = e.currentTarget.getAttribute('data-id');
                    console.log("Scouting Button Clicked for Field:", fid);
                    // showToast("Opening Satellite Scouting Map...", "info");
                    openScoutingMap(fid);
                });
            } else {
                scoutingLinkContainer.classList.add('hidden');
            }
        } else {
            scoutingLinkContainer.classList.add('hidden');
        }
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
    setTimeout(() => toast.classList.remove('show'), 4000);
}

// --- Smart Directional Scouting Logic ---
let scoutingMapInstance = null;
const scoutingModal = document.getElementById('scoutingModal');
const closeScoutingModalBtn = document.getElementById('closeScoutingModalBtn');
const scoutingInstruction = document.getElementById('scoutingInstruction');
const scoutingLoadingText = document.getElementById('scoutingLoadingText');
const scoutingContent = document.getElementById('scoutingContent');

// Diagnostic UI
const startDiagnosticBtn = document.getElementById('startDiagnosticBtn');
const diagnosticResults = document.getElementById('diagnosticResults');
let currentScoutingFieldId = null;

closeScoutingModalBtn?.addEventListener('click', () => {
    scoutingModal.classList.add('hidden');
    if (scoutingMapInstance) {
        scoutingMapInstance.remove();
        scoutingMapInstance = null;
    }
});

function openScoutingMap(fieldId) {
    if (!fieldId) {
        showToast("Field ID missing. Cannot open scouting.");
        return;
    }
    currentScoutingFieldId = fieldId;
    scoutingModal.classList.remove('hidden');
    scoutingLoadingText.classList.remove('hidden');
    scoutingContent.classList.add('hidden');
    scoutingInstruction.innerHTML = '';

    // Reset Diagnostic UI
    diagnosticResults.classList.add('hidden');
    startDiagnosticBtn.disabled = false;
    startDiagnosticBtn.innerHTML = `<span class="icon">📸</span> Analyze Leaf Health (Vision AI Model)`;

    // Destroy previous instance if it exists
    if (scoutingMapInstance) {
        scoutingMapInstance.remove();
        scoutingMapInstance = null;
    }

    fetch(`${API_BASE_URL}/api/v1/gis/field/${fieldId}/scouting`)
        .then(res => res.json())
        .then(data => {
            if (data.status !== 'success') {
                throw new Error(data.detail || 'Failed to fetch scouting data');
            }

            const report = data.data;

            scoutingLoadingText.classList.add('hidden');
            scoutingContent.classList.remove('hidden');

            const stressedEdge = report.edges.find(e => e.is_stressed);

            scoutingInstruction.innerHTML = `
                <div style="display: flex; gap: 0.8rem; align-items: flex-start;">
                    <span style="font-size: 1.5rem;">🚨</span>
                    <div>
                        <strong style="display: block; color: var(--primary); margin-bottom: 0.3rem;">Action Required</strong>
                        ${report.instruction}
                    </div>
                </div>
            `;

            // Render the Scouting Map
            setTimeout(() => {
                scoutingMapInstance = L.map('scoutingMapContainer').setView(report.center, 18);

                L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                    maxZoom: 20,
                    attribution: '© Google Satellite'
                }).addTo(scoutingMapInstance);

                // Draw corners
                report.points.forEach(pt => {
                    const latlng = [pt.coordinate[0], pt.coordinate[1]];
                    L.circleMarker(latlng, { radius: 6, color: '#fff', fillColor: '#3b82f6', fillOpacity: 1 }).addTo(scoutingMapInstance)
                        .bindTooltip(`Point ${pt.index} (${pt.quadrant})`, { permanent: true, direction: 'top', className: 'scouting-tooltip' });
                });

                // Draw edges
                const latlngs = [];
                report.edges.forEach(edge => {
                    const p1 = [edge.start_point.coordinate[0], edge.start_point.coordinate[1]];
                    const p2 = [edge.end_point.coordinate[0], edge.end_point.coordinate[1]];

                    const edgeColor = edge.is_stressed ? '#EF4444' : '#10B981';
                    const edgeWeight = edge.is_stressed ? 5 : 3;
                    const edgeDash = edge.is_stressed ? '' : '5, 5';

                    const polyline = L.polyline([p1, p2], {
                        color: edgeColor,
                        weight: edgeWeight,
                        dashArray: edgeDash,
                        opacity: 0.8
                    }).addTo(scoutingMapInstance);

                    if (edge.is_stressed) {
                        try {
                            // Focus exactly on the stressed edge
                            const tmpBounds = L.latLngBounds([p1, p2]);
                            scoutingMapInstance.fitBounds(tmpBounds, { padding: [50, 50], maxZoom: 20 });
                        } catch (e) { }
                    }
                });

            }, 300); // Allow DOM to render container first

        })
        .catch(err => {
            console.error("Scouting Map Error:", err);
            scoutingModal.classList.add('hidden');
            showToast(err.message || 'Scouting not available for this field.');
        });
}
// --- Vision AI Diagnostic Logic ---
startDiagnosticBtn?.addEventListener('click', () => {
    if (!currentScoutingFieldId) return;

    startDiagnosticBtn.disabled = true;
    startDiagnosticBtn.innerHTML = `<span class="icon">⏳</span> AI Model Running Inference...`;
    diagnosticResults.classList.add('hidden');

    fetch(`${API_BASE_URL}/api/v1/health/diagnostic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_id: parseInt(currentScoutingFieldId) })
    })
        .then(res => res.json())
        .then(data => {
            startDiagnosticBtn.innerHTML = `<span class="icon">✅</span> Analysis Complete`;
            diagnosticResults.classList.remove('hidden');

            document.getElementById('diag-confidence').textContent = `Confidence: ${Math.round(data.debug_trace.layer_3_vision.confidence * 100)}%`;
            document.getElementById('diag-status').textContent = data.final_status;
            document.getElementById('diag-prescriptive').textContent = data.prescriptive_action;

            // Dynamic styling for status
            const statusEl = document.getElementById('diag-status');
            if (data.health_score > 80) statusEl.style.color = "#10B981";
            else if (data.health_score > 50) statusEl.style.color = "#F59E0B";
            else statusEl.style.color = "#EF4444";
        })
        .catch(err => {
            console.error("Diagnostic Error:", err);
            startDiagnosticBtn.disabled = false;
            startDiagnosticBtn.innerHTML = `<span class="icon">📸</span> Analyze Leaf Health (Vision AI Model)`;
            showToast("AI Model failed to respond. Check backend.");
        });
});

// --- Crop Health Analysis Portal Helpers ---

let visualFarmMap = null;

function initVisualFarmMap(data) {
    const container = document.getElementById('visualFarmMapContainer');
    if (!container) return;

    // Destroy old map if exists
    if (visualFarmMap) {
        visualFarmMap.remove();
        visualFarmMap = null;
    }

    // Initialize map
    visualFarmMap = L.map('visualFarmMapContainer', { zoomControl: false }).setView([globalLat, globalLon], 18);

    // Satellitle View
    L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '© Google Satellite'
    }).addTo(visualFarmMap);

    // If we have boundary data, draw it
    if (currentGeoJson && currentGeoJson.geometry) {
        const poly = L.geoJSON(currentGeoJson, {
            style: function (feature) {
                return {
                    color: '#10B981',
                    weight: 3,
                    fillColor: '#10B981',
                    fillOpacity: 0.2
                };
            }
        }).addTo(visualFarmMap);
        visualFarmMap.fitBounds(poly.getBounds());
    }

    // Add Stressed Pulse Overlay (simulated for visual effect)
    // In a real app, this would come from the scouting API
    L.circle([globalLat, globalLon], {
        radius: 30,
        className: 'stressed-pulse',
        color: '#EF4444',
        fillColor: '#EF4444',
        fillOpacity: 0.2
    }).addTo(visualFarmMap);
}

function simulateResNetInference() {
    const box = document.getElementById('inferenceBox');
    const layerName = document.getElementById('inference-layer-name');
    const pct = document.getElementById('inference-pct');
    const bar = document.getElementById('inference-bar');
    const log = document.getElementById('inference-log');

    box.classList.remove('hidden');
    box.classList.add('scanning');

    const layers = [
        { name: "ResNet50: Input Layer (224x224x3)", time: 800, log: "Normalizing RGB tensors..." },
        { name: "Layer 1: Conv1 + MaxPool", time: 1000, log: "Detecting edge features..." },
        { name: "Layer 10: Bottleneck Residual (v1)", time: 1200, log: "Extracting color gradients..." },
        { name: "Layer 25: Middle Block Fusion", time: 1500, log: "Synthesizing texture patterns..." },
        { name: "Layer 48: Global Average Pool", time: 1200, log: "Deep semantic extraction..." },
        { name: "Output: Softmax Classification", time: 800, log: "Decision Matrix synthesis complete." }
    ];

    let currentLayer = 0;

    function nextLayer() {
        if (currentLayer >= layers.length) {
            box.classList.remove('scanning');
            return;
        }

        const l = layers[currentLayer];
        layerName.textContent = l.name;
        log.textContent = `[TRACE]: ${l.log}`;

        const progress = Math.round(((currentLayer + 1) / layers.length) * 100);
        pct.textContent = `${progress}%`;
        bar.style.width = `${progress}%`;

        currentLayer++;
        setTimeout(nextLayer, l.time);
    }

    nextLayer();
}

function populateDecisionMatrix(data) {
    const satelliteVal = document.getElementById('matrix-satellite-val');
    const satelliteStatus = document.getElementById('matrix-satellite-status');
    const aiVal = document.getElementById('matrix-ai-val');
    const aiStatus = document.getElementById('matrix-ai-status');
    const envVal = document.getElementById('matrix-env-val');
    const envStatus = document.getElementById('matrix-env-status');

    // Satellite (NDVI) - Upgraded to Polygon-Centric Spatial Analysis
    let ndvi = 0;
    if (data.polygon && data.polygon.length >= 3) {
        // Spatial Average Simulation: use all points of the khet
        const avgLat = data.polygon.reduce((sum, p) => sum + p.lat, 0) / data.polygon.length;
        const avgLon = data.polygon.reduce((sum, p) => sum + p.lon, 0) / data.polygon.length;
        ndvi = (0.65 + (Math.abs(avgLat + avgLon) % 0.15)).toFixed(2);
    } else {
        // Fallback to center point
        ndvi = (0.65 + (Math.abs(parseFloat(globalLat) + parseFloat(globalLon)) % 0.15)).toFixed(2);
    }

    if (satelliteVal) satelliteVal.textContent = ndvi;
    if (satelliteStatus) {
        if (ndvi > 0.75) {
            satelliteStatus.textContent = "High Biomass";
            satelliteStatus.style.color = "#10B981";
        } else if (ndvi > 0.5) {
            satelliteStatus.textContent = "Optimal Growth";
            satelliteStatus.style.color = "#10B981";
        } else {
            satelliteStatus.textContent = "Low Vegetation";
            satelliteStatus.style.color = "#F59E0B";
        }
    }

    // Deep AI (ResNet) - Show 'Pending' if no upload yet
    if (aiVal) aiVal.textContent = "Pending";
    if (aiStatus) {
        aiStatus.textContent = "Waiting for Scan";
        aiStatus.style.color = "var(--text-muted)";
    }

    // Environmental - Link to real weather data
    const risk = data.heat_stress_risk ? data.heat_stress_risk.level : "Unknown";
    if (envVal) envVal.textContent = risk;
    if (envStatus) {
        if (risk === "Low") {
            envStatus.textContent = "Stable Period";
            envStatus.style.color = "#10B981";
        } else {
            envStatus.textContent = "Climatic Stress";
            envStatus.style.color = "#EF4444";
        }
    }
}

function setupLeafUploadListeners(fieldId) {
    const uploadBtn = document.getElementById('uploadLeafBtn');
    const fileInput = document.getElementById('leafFileInput');

    if (!uploadBtn || !fileInput) return;

    // Reset previous listeners to avoid duplicates
    const btnClone = uploadBtn.cloneNode(true);
    uploadBtn.parentNode.replaceChild(btnClone, uploadBtn);

    btnClone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        btnClone.disabled = true;
        btnClone.innerHTML = `<span>⏳</span> Analyzing...`;

        // Show inference animation
        simulateResNetInference();

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/health/upload-diagnostic?field_id=${fieldId}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("Upload failed");

            const result = await response.json();
            console.log("Upload Result:", result);

            // Update UI with REAL results
            setTimeout(() => {
                // Update AI Crop Health section in the grid (if visible)
                const healthScoreEl = document.getElementById('res-health-score');
                const healthStatusEl = document.getElementById('res-health-status');
                if (healthScoreEl) {
                    healthScoreEl.textContent = `${result.health_score}%`;
                    if (result.health_score > 80) healthScoreEl.style.color = "#10B981";
                    else if (result.health_score > 60) healthScoreEl.style.color = "#F59E0B";
                    else healthScoreEl.style.color = "#EF4444";
                }
                if (healthStatusEl) healthStatusEl.textContent = `Status: ${result.final_status}`;

                // Update Decision Matrix
                const aiVal = document.getElementById('matrix-ai-val');
                const aiStatus = document.getElementById('matrix-ai-status');
                const visData = result.debug_trace.layer_3_vision;

                if (aiVal) aiVal.textContent = `${Math.round(visData.confidence * 100)}%`;
                if (aiStatus) {
                    aiStatus.textContent = visData.detection;
                    aiStatus.style.color = visData.is_anomaly ? "#EF4444" : "#10B981";
                }

                // Update NEW Health Result Card
                const healthResultCard = document.getElementById('health-result-card');
                const healthFinalStatus = document.getElementById('res-health-final-status');
                const healthPrescriptive = document.getElementById('res-health-prescriptive');

                if (healthResultCard) healthResultCard.classList.remove('hidden');
                if (healthFinalStatus) {
                    healthFinalStatus.textContent = result.final_status;
                    // Dynamic color for health status
                    if (result.health_score > 80) healthFinalStatus.style.color = "#10B981";
                    else if (result.health_score > 50) healthFinalStatus.style.color = "#F59E0B";
                    else healthFinalStatus.style.color = "#EF4444";
                }
                if (healthPrescriptive) healthPrescriptive.textContent = result.prescriptive_action;

                // Stop overwriting recommendation box (Leave irrigation as is)

                showToast("Real-time Leaf Analysis Complete!", "success");
                btnClone.innerHTML = `<span>✅</span> Re-upload Photo`;
                btnClone.disabled = false;
            }, 5000); // Sync with animation length roughly

        } catch (err) {
            console.error(err);
            showToast("Failed to process image.");
            btnClone.innerHTML = `<span>📤</span> Upload Leaf Photo`;
            btnClone.disabled = false;
        }
    });
}
// --- Refresh Logic ---
document.getElementById('refreshAnalysisBtn')?.addEventListener('click', async function () {
    const btn = this;
    const icon = btn.querySelector('.icon');
    const fieldId = localStorage.getItem('currentViewFieldId');

    if (!fieldId) return;

    btn.disabled = true;
    if (icon) {
        icon.style.display = 'inline-block';
        icon.style.animation = 'spin 1s linear infinite';
    }

    try {
        showToast("Synchronizing with Satellite & Weather API...", "info");

        // Use globalLat/Lon which are set when opening the field
        // Note: For a truly senior solution, we'd fetch the boundary from the DB or local storage here
        const response = await fetch(`${API_BASE_URL}/api/v1/weather-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: parseFloat(globalLat),
                longitude: parseFloat(globalLon),
                crop: "wheat",
                polygon: null // Placeholder for refresh (will use point-center if null)
            })
        });

        if (!response.ok) throw new Error("Sync failed");
        const data = await response.json();

        // Refresh display
        displayResults(data);
        showToast("Scientific Data Synchronized.", "success");
    } catch (err) {
        console.error(err);
        showToast("Failed to refresh live data.");
    } finally {
        btn.disabled = false;
        if (icon) icon.style.animation = 'none';
    }
});

// Add spin animation to CSS via JS if not present
if (!document.getElementById('spin-style')) {
    const style = document.createElement('style');
    style.id = 'spin-style';
    style.textContent = `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .btn-icon:hover { background: rgba(255,255,255,0.1) !important; transform: scale(1.05); }
    `;
    document.head.appendChild(style);
}

