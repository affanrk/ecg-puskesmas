import { CONFIG, EVENTS } from '../../config.js';
import { globalEventBus } from '../../core/Events.js';
import { store } from '../../core/State.js';
import { sendJson } from '../../services/Socket.js';
import { formatDuration, escapeHtml } from '../../utils/Helpers.js';
import { Toast } from '../../shared/Toast.js';
import { ChartManager } from '../../shared/Charts.js';
import { PatientModal } from '../../shared/PatientModal.js';

export class MonitorController {
    constructor() {
        // Init Components
        this.charts = new ChartManager();
        this.patientModal = new PatientModal((data) => this.handlePatientInput(data));

        // Local State untuk UI
        this.recordingTimerInterval = null;

        // Cache DOM Elements (agar tidak querySelector berulang kali)
        this.dom = {
            // Stats
            bpmValue: document.getElementById('bpm-value'),
            recordingTimer: document.getElementById('recording-timer'),

            // AI Card
            aiCard: document.getElementById('ai-card-container'),
            aiText: document.getElementById('ai-prediction-text'),
            aiSub: document.getElementById('ai-prediction-sub'),
            aiBar: document.getElementById('ai-confidence-bar'),

            // Patient Info
            sectionInitial: document.getElementById('section-initial'),
            sectionPatient: document.getElementById('section-patient'),
            dispName: document.getElementById('disp-name'),
            dispSubject: document.getElementById('disp-subject'),
            dispAge: document.getElementById('disp-age'),
            dispGender: document.getElementById('disp-gender'),
            dispRiwayat: document.getElementById('disp-riwayat'),

            // Buttons
            btnRecord: document.getElementById('btn-record-toggle'),
            btnReset: document.getElementById('btn-reset-session'),
            btnNewSession: document.getElementById('btn-input-data'),

            // Device Dropdown
            deviceBtnText: document.getElementById('device-btn-text'),
            deviceStatusDot: document.getElementById('device-status-dot'),
            deviceListContainer: document.getElementById('device-list-container'),
            deviceSearch: document.getElementById('device-search-input'),
            deviceListWrapper: document.getElementById('device-list-wrapper'),
            btnDeviceDisconnect: document.getElementById('btn-disconnect-device'),

            // Table
            tableBody: document.getElementById('live-table-body'),
            pageCurrent: document.getElementById('live-page-current'),
            pageTotal: document.getElementById('live-page-total'),
            btnPrev: document.getElementById('btn-prev-live'),
            btnNext: document.getElementById('btn-next-live'),
            totalCount: document.getElementById('live-total-count'),

            // Header Indicator
            headerIndicator: document.getElementById('header-status-indicator'),

            // Connection Status
            connBadge: document.getElementById('connection-badge'),
            connText: document.getElementById('connection-text'),

            // Device button
            ddBtn: document.getElementById('device-btn'),

            // Lead Toggles
            leadToggles: document.querySelectorAll('.lead-toggle'),
        };

        this.init();
    }

    init() {
        this.charts.init();
        this.setupEventListeners();
        this.setupEventSubscribers();
        this.renderInitialState();
    }

    // --- Setup Listeners (DOM) ---
    setupEventListeners() {
        // Device Dropdown Toggles
        if (this.dom.ddBtn) {
            this.dom.ddBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dom.deviceListWrapper.classList.toggle('hidden');
                if (!this.dom.deviceListWrapper.classList.contains('hidden')) {
                    this.dom.deviceSearch.focus();
                }
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (this.dom.ddBtn && !this.dom.ddBtn.contains(e.target) && !this.dom.deviceListWrapper.contains(e.target)) {
                this.dom.deviceListWrapper.classList.add('hidden');
            }
        });

        // Device Search
        this.dom.deviceSearch.addEventListener('input', (e) => this.filterDeviceList(e.target.value));

        // Disconnect Device
        this.dom.btnDeviceDisconnect.addEventListener('click', () => {
            if (store.isRecording) {
                if (!confirm("This action will stop recording. Stop and disconnect?")) return;
                sendJson({ type: "stop_recording", device_id: store.currentDeviceId });
            }
            this.selectDevice("");
            this.dom.deviceListWrapper.classList.add('hidden');
        });

        // Patient Session
        this.dom.btnNewSession.addEventListener('click', () => {
            if (!store.currentDeviceId) return Toast.show("Select a device first", "error");
            this.patientModal.show();
        });

        this.dom.btnReset.addEventListener('click', () => this.handleResetSession());

        // Recording
        this.dom.btnRecord.addEventListener('click', () => this.toggleRecording());

        // Pagination
        this.dom.btnPrev.addEventListener('click', () => this.changePage(-1));
        this.dom.btnNext.addEventListener('click', () => this.changePage(1));

        // Lead Toggles
        this.dom.leadToggles.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const leadIndex = parseInt(e.target.value);
                const isVisible = e.target.checked;
                this.charts.toggleLead(leadIndex, isVisible);
            });
        });
    }

    // --- Setup Subscribers (Event Bus) ---
    setupEventSubscribers() {
        globalEventBus.on(EVENTS.CHART.ECG_DATA, (data) => this.charts.updateECG(data));
        globalEventBus.on(EVENTS.CHART.METRICS, (data) => { if (data.bpm) this.dom.bpmValue.textContent = data.bpm; });
        globalEventBus.on(EVENTS.DEVICE.LIST_UPDATED, (devices) => this.renderDeviceList(devices));

        globalEventBus.on(EVENTS.STATE.LIVE_DATA_UPDATED, (data) => {
            this.renderTable(data);

            if (data.length > 0) {
                const latestResult = (data[0].classification === 'Recording...') ? data[1] : data[0];
                if (latestResult) {
                    this.updateAICard(latestResult);
                }
            }
        });

        globalEventBus.on(EVENTS.STATE.RECORDING_CHANGED, (isRecording) => this.updateRecordingUI(isRecording));
        globalEventBus.on(EVENTS.STATE.PATIENT_CHANGED, (patient) => this.updatePatientUI(patient));

        globalEventBus.on(EVENTS.WS.CONNECTED, () => this.updateConnectionStatus(true));
        globalEventBus.on(EVENTS.WS.DISCONNECTED, () => this.updateConnectionStatus(false));
    }

    // --- Logic Interaksi ---
    updateConnectionStatus(isOnline) {
        if (isOnline) {
            this.dom.connBadge.className = "flex w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]";
            this.dom.connText.textContent = "Online";
            this.dom.connText.className = "text-[10px] font-bold text-emerald-700 transition-colors duration-300";
            Toast.show("Server Connected");
        } else {
            this.dom.connBadge.className = "flex w-2 h-2 bg-rose-500 rounded-full shadow-none";
            this.dom.connText.textContent = "Offline";
            this.dom.connText.className = "text-[10px] font-bold text-rose-700 transition-colors duration-300";
            Toast.show("Server Disconnected", "error");
        }
    }

    handlePatientInput(data) {
        store.setPatientData(data);
        this.charts.clear();
        this.updateAICard(null);
    }

    handleResetSession() {
        if (store.isRecording) return Toast.show("Stop recording first.", "error");
        if (!confirm("End current session? All data will be reset.")) return;

        store.setPatientData(null);
        this.charts.clear();
        this.updateAICard(null);
        this.dom.bpmValue.textContent = "--";

        this.dom.recordingTimer.textContent = "00:00";
    }

    toggleRecording() {
        if (!store.currentDeviceId) return Toast.show("No device selected", "error");

        if (store.isRecording) {
            sendJson({ type: "stop_recording", device_id: store.currentDeviceId });
        } else {
            if (!store.patient) return Toast.show("No active session.", "error");

            const payload = {
                type: "start_recording",
                device_id: store.currentDeviceId,
                subject_id: store.patient.nik,
                patient_name: store.patient.name,
                umur: store.patient.age,
                jenis_kelamin: store.patient.gender,
                tanggal_lahir: store.patient.dob,
                tempat_lahir: store.patient.pob,
                riwayat_penyakit: store.patient.riwayat
            };
            sendJson(payload);
        }
    }

    selectDevice(deviceId) {
        if (store.isRecording && deviceId !== store.currentDeviceId) {
        }

        if (store.currentDeviceId) {
            sendJson({ type: "unsubscribe" });
        }

        store.setDeviceId(deviceId);
        this.charts.clear();
        this.dom.bpmValue.textContent = "--";

        if (deviceId) {
            this.dom.deviceBtnText.textContent = deviceId;
            this.dom.deviceBtnText.classList.add('text-brand-700', 'font-bold');
            this.dom.deviceStatusDot.className = "w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";
            sendJson({ type: "subscribe_to_device", device_id: deviceId });
        } else {
            this.dom.deviceBtnText.textContent = "Select Device...";
            this.dom.deviceBtnText.classList.remove('text-brand-700', 'font-bold');
            this.dom.deviceStatusDot.className = "w-2 h-2 rounded-full bg-slate-300";
        }
    }

    // --- Rendering UI ---
    renderInitialState() {
        this.updatePatientUI(null);
        this.renderTable([]);
    }

    updatePatientUI(patient) {
        if (patient) {
            this.dom.sectionInitial.classList.replace('flex', 'hidden');
            this.dom.sectionPatient.classList.remove('hidden');

            this.dom.dispName.textContent = patient.name;
            this.dom.dispSubject.textContent = patient.nik;
            this.dom.dispAge.textContent = `${patient.age} Th`;
            this.dom.dispGender.textContent = patient.gender === 'L' ? 'Laki-laki' : 'Perempuan';
            this.dom.dispRiwayat.textContent = patient.riwayat;
        } else {
            this.dom.sectionInitial.classList.replace('hidden', 'flex');
            this.dom.sectionPatient.classList.add('hidden');
        }
    }

    updateRecordingUI(isRecording) {
        // Button State
        if (isRecording) {
            this.dom.btnRecord.innerHTML = '<div class="w-1.5 h-1.5 bg-white rounded-sm animate-pulse"></div><span>Stop</span>';
            this.dom.btnRecord.classList.replace('bg-emerald-500', 'bg-slate-700');
            this.dom.btnRecord.classList.replace('hover:bg-emerald-600', 'hover:bg-slate-800');

            this.dom.headerIndicator.classList.replace('hidden', 'flex');

            // Start Timer
            if (!this.recordingTimerInterval) {
                this.recordingTimerInterval = setInterval(() => {
                    const sec = store.incrementTimer();
                    this.dom.recordingTimer.textContent = formatDuration(sec);
                }, 1000);
            }
        } else {
            this.dom.btnRecord.innerHTML = 'Start Rec';
            this.dom.btnRecord.classList.replace('bg-slate-700', 'bg-emerald-500');
            this.dom.btnRecord.classList.replace('hover:bg-slate-800', 'hover:bg-emerald-600');

            this.dom.headerIndicator.classList.replace('flex', 'hidden');

            // Stop Timer
            if (this.recordingTimerInterval) {
                clearInterval(this.recordingTimerInterval);
                this.recordingTimerInterval = null;
            }
        }
    }

    updateAICard(result) {
        if (!result) {
            this.dom.aiText.textContent = "Waiting...";
            this.dom.aiSub.textContent = "Conf: 0%";
            this.dom.aiBar.style.width = "0%";
            this.dom.aiCard.className = "h-full bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl shadow-lg shadow-brand-500/20 p-4 text-white flex flex-col justify-between relative overflow-hidden transition-colors duration-500";
            return;
        }

        this.dom.aiText.textContent = result.classification;
        this.dom.aiSub.textContent = `Conf: ${(result.confidence * 100).toFixed(0)}%`;
        this.dom.aiBar.style.width = `${(result.confidence * 100).toFixed(0)}%`;

        const isAbnormal = ['Abnormal', 'Aritmia', 'Berpotensi'].some(x => result.classification.includes(x));
        if (isAbnormal) {
            this.dom.aiCard.className = "h-full bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl shadow-lg shadow-rose-500/20 p-4 text-white flex flex-col justify-between relative overflow-hidden transition-colors duration-500";
        } else {
            this.dom.aiCard.className = "h-full bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl shadow-lg shadow-brand-500/20 p-4 text-white flex flex-col justify-between relative overflow-hidden transition-colors duration-500";
        }
    }

    renderDeviceList(devices) {
        devices.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
        this.dom.deviceListContainer.innerHTML = '';

        if (devices.length === 0) {
            this.dom.deviceListContainer.innerHTML = `<div class="px-4 py-4 text-xs text-slate-400 text-center italic">No devices found</div>`;
            return;
        }

        devices.forEach(d => {
            const div = document.createElement('div');
            const isSelected = d.id === store.currentDeviceId;
            const isBusy = d.is_locked && !isSelected;

            div.className = `px-4 py-2.5 border-b border-slate-50 flex justify-between items-center cursor-pointer transition-colors ${isSelected ? 'bg-brand-50' : 'hover:bg-slate-50'} ${isBusy ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'bg-white'}`;
            div.dataset.id = d.id;

            let statusHtml = '';
            if (isSelected) statusHtml = `<span class="text-[9px] font-bold text-brand-600 bg-brand-100 px-1.5 py-0.5 rounded border border-brand-200">CONNECTED</span>`;
            else if (isBusy) statusHtml = `<span class="text-[9px] font-bold text-rose-500 flex items-center gap-1"><div class="w-1.5 h-1.5 rounded-full bg-rose-500"></div> BUSY</span>`;

            div.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full ${isSelected ? 'bg-brand-500' : (isBusy ? 'bg-slate-300' : 'bg-emerald-400')}"></div>
                    <span class="text-xs font-medium text-slate-700">${escapeHtml(d.id)}</span>
                </div>
                ${statusHtml}
            `;

            if (!isBusy && !isSelected) {
                div.onclick = (e) => {
                    e.stopPropagation();
                    if (store.isRecording) {
                        if (!confirm("Recording is in progress. Stop and switch to " + d.id + "?")) return;
                        sendJson({ type: "stop_recording", device_id: store.currentDeviceId });
                    }

                    this.selectDevice(d.id);
                    this.dom.deviceListWrapper.classList.add('hidden');
                    this.dom.deviceSearch.value = '';
                    this.filterDeviceList('');
                };
            }
            this.dom.deviceListContainer.appendChild(div);
        });
    }

    filterDeviceList(query) {
        const q = query.toLowerCase();
        const items = this.dom.deviceListContainer.children;
        Array.from(items).forEach(div => {
            if (div.innerText.toLowerCase().includes(q)) div.classList.remove('hidden');
            else div.classList.add('hidden');
        });
    }

    // --- Table & Pagination ---
    changePage(delta) {
        const data = store.liveData;
        const maxPage = Math.ceil(data.length / CONFIG.ROWS_PER_PAGE_LIVE) || 1;
        const newPage = store._data.livePage + delta;

        if (newPage >= 1 && newPage <= maxPage) {
            store._data.livePage = newPage;
            this.renderTable(data);
        }
    }

    renderTable(data) {
        const tbody = this.dom.tableBody;
        if (!tbody) return;
        tbody.innerHTML = '';

        this.dom.totalCount.textContent = `${data.length} Recs`;

        const currentPage = store._data.livePage;
        const rowsPerPage = CONFIG.ROWS_PER_PAGE_LIVE;
        const totalPages = Math.ceil(data.length / rowsPerPage) || 1;

        // Reset page ke 1 jika data berubah drastis dan page saat ini out of range
        if (currentPage > totalPages) store._data.livePage = 1;

        this.dom.pageCurrent.textContent = store._data.livePage;
        this.dom.pageTotal.textContent = totalPages;
        this.dom.btnPrev.disabled = (store._data.livePage <= 1);
        this.dom.btnNext.disabled = (store._data.livePage >= totalPages);

        const start = (store._data.livePage - 1) * rowsPerPage;
        const paginatedData = data.slice(start, start + rowsPerPage);

        if (paginatedData.length === 0) {
            // Tampilkan pesan "Waiting..." hanya jika ada sesi aktif
            if (store.patient) {
                tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400 text-xs italic">Waiting for analysis...</td></tr>`;
            } else {
                // Kosong bersih jika tidak ada sesi
            }
            return;
        }

        paginatedData.forEach(rec => {
            const timeStr = new Date(rec.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const safeClass = (rec.classification || '').toString();

            let statusColor = 'bg-slate-100 text-slate-500 ring-slate-200';
            if (safeClass === 'Normal') statusColor = 'bg-emerald-50 text-emerald-600 ring-emerald-200';
            else if (['Abnormal', 'Aritmia', 'Berpotensi'].some(x => safeClass.includes(x))) statusColor = 'bg-rose-50 text-rose-600 ring-rose-200';
            else if (safeClass === 'Recording...') statusColor = 'bg-blue-50 text-blue-600 ring-blue-200 animate-pulse';

            const row = `
                <tr class="hover:bg-slate-50 transition-colors border-b border-slate-50 h-10 text-xs leading-none">
                    <td class="px-4 py-0 font-mono text-slate-500 align-middle">${timeStr}</td>
                    <td class="px-4 py-0 font-mono text-slate-600 align-middle">${escapeHtml(rec.subject_id)}</td>
                    <td class="px-4 py-0 font-bold text-slate-700 truncate max-w-[100px] align-middle">${escapeHtml(rec.patient_name)}</td>
                    <td class="px-4 py-0 align-middle"><span class="inline-flex items-center rounded px-2 py-1 text-[10px] font-bold ring-1 ring-inset uppercase tracking-wide ${statusColor}">${escapeHtml(safeClass)}</span></td>
                </tr>`;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    }
}