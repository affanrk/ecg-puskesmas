import { globalEventBus } from './Events.js';
import { EVENTS } from '../config.js';

class AppState {
    constructor() {
        this._data = {
            currentDeviceId: "",
            isRecording: false,
            recordingSeconds: 0,
            patient: null,
            liveData: [],
            archiveData: [],
            performance: { latency: 0, jitter: 0, loss: 0 },
            livePage: 1,
            archivePage: 1
        };
    }

    // --- Getters ---
    get currentDeviceId() { return this._data.currentDeviceId; }
    get isRecording() { return this._data.isRecording; }
    get patient() { return this._data.patient; }
    get liveData() { return this._data.liveData; }
    get archiveData() { return this._data.archiveData; }
    get livePage() { return this._data.livePage; }
    get archivePage() { return this._data.archivePage; }

    // --- Setters / Actions ---
    setDeviceId(id) {
        this._data.currentDeviceId = id;
        
        // Ensure recording state is reset when switching devices/disconnecting
        this.setRecordingState(false);

        // Reset Performance only
        this._data.performance = { latency: 0, jitter: 0, loss: 0 };
        globalEventBus.emit(EVENTS.STATE.PERFORMANCE_UPDATED, this._data.performance);

        globalEventBus.emit(EVENTS.DEVICE.SELECTED, id);
    }

    setRecordingState(isRecording) {
        this._data.isRecording = isRecording;

        // Remove old 'Recording...' rows
        this._data.liveData = this._data.liveData.filter(r => r.classification !== 'Recording...');

        if (isRecording) {
            this._data.liveData.unshift({
                timestamp: new Date().toISOString(),
                device_id: this._data.currentDeviceId,
                subject_id: this._data.patient?.nik || "-",
                patient_name: this._data.patient?.name || "-",
                classification: "Recording..."
            });
        }

        globalEventBus.emit(EVENTS.STATE.RECORDING_CHANGED, isRecording);
        globalEventBus.emit(EVENTS.STATE.LIVE_DATA_UPDATED, this._data.liveData);
    }

    setPatientData(data) {
        this._data.patient = data;
        globalEventBus.emit(EVENTS.STATE.PATIENT_CHANGED, data);

        if (!data) {
            this._data.liveData = [];
            this._data.recordingSeconds = 0;
            globalEventBus.emit(EVENTS.STATE.LIVE_DATA_UPDATED, []);
        }
    }

    addLiveResult(logItem) {
        // 1. Clean temporary Recording status
        this._data.liveData = this._data.liveData.filter(r => r.classification !== 'Recording...');

        // 2. Add new data to Live Data
        this._data.liveData.unshift(logItem);
        this._data.archiveData.unshift(logItem);
        globalEventBus.emit(EVENTS.STATE.ARCHIVE_DATA_UPDATED, this._data.archiveData);

        // 3. Restore Recording status if recording
        if (this._data.isRecording) {
            this._data.liveData.unshift({
                timestamp: new Date().toISOString(),
                device_id: this._data.currentDeviceId,
                subject_id: this._data.patient?.nik || "-",
                patient_name: this._data.patient?.name || "-",
                classification: "Recording..."
            });
        }

        // Limit memory
        if (this._data.liveData.length > 200) this._data.liveData = this._data.liveData.slice(0, 200);

        globalEventBus.emit(EVENTS.STATE.LIVE_DATA_UPDATED, this._data.liveData);
    }

    setArchiveData(data) {
        this._data.archiveData = data;
        this._data.archivePage = 1;
        globalEventBus.emit(EVENTS.STATE.ARCHIVE_DATA_UPDATED, data);
    }

    // Pagination Setters
    setLivePage(page) { this._data.livePage = page; }
    setArchivePage(page) { this._data.archivePage = page; }

    updatePerformance(latency, jitter, loss) {
        this._data.performance = { latency, jitter, loss };
        globalEventBus.emit(EVENTS.STATE.PERFORMANCE_UPDATED, this._data.performance);
    }

    incrementTimer() {
        if (this._data.isRecording) {
            this._data.recordingSeconds++;
            return this._data.recordingSeconds;
        }
        return 0;
    }
}

export const store = new AppState();