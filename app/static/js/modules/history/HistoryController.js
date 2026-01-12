import { store } from '../../core/State.js';
import { fetchHistory, downloadRecording } from '../../services/Api.js';
import { formatDate, escapeHtml, debounce } from '../../utils/Helpers.js';
import { Toast } from '../../shared/Toast.js';
import { CONFIG, EVENTS } from '../../config.js';
import { globalEventBus } from '../../core/Events.js';

export class HistoryController {
    constructor() {
        this.selectedRecord = null;

        // Cache DOM Elements
        this.dom = {
            tableBody: document.getElementById("history-table-body-download"),
            searchInput: document.getElementById('archive-search'),
            dateRange: document.getElementById('archive-date-range'),
            btnClear: document.getElementById('btn-clear-filter'),

            // Pagination
            pageInput: document.getElementById('archive-page-input'), // Text indicator
            totalPages: document.getElementById('archive-total-pages'),
            btnPrev: document.getElementById('btn-prev-archive'),
            btnNext: document.getElementById('btn-next-archive'),

            // Action Buttons
            btnDownloadRaw: document.getElementById('btn-download-raw'),
            btnDownloadFeature: document.getElementById('btn-download-feature'),
            btnDownloadPlot: document.getElementById('btn-download-plot')
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        // Load initial data
        this.loadData();
    }

    setupEventListeners() {
        // Search dengan Debounce (tunggu 500ms setelah user berhenti mengetik)
        this.dom.searchInput.addEventListener('input', debounce(() => {
            this.loadData();
        }, 500));

        // Clear Filter
        if (this.dom.btnClear) {
            this.dom.btnClear.addEventListener('click', () => {
                this.dom.searchInput.value = "";
                if (this.dom.dateRange._flatpickr) this.dom.dateRange._flatpickr.clear();
                this.loadData();
            });
        }

        // Date Picker (Flatpickr)
        if (this.dom.dateRange) {
            flatpickr(this.dom.dateRange, {
                mode: "range",
                dateFormat: "Y-m-d",
                altInput: true,
                altFormat: "j M Y",
                maxDate: "today",
                locale: { rangeSeparator: " - " },
                onChange: (selectedDates) => {
                    // Load data jika user select range (2 tanggal) atau clear (0 tanggal)
                    if (selectedDates.length === 2 || selectedDates.length === 0) {
                        this.loadData();
                    }
                }
            });
        }

        // Pagination
        this.dom.btnPrev.addEventListener('click', () => this.changePage(-1));
        this.dom.btnNext.addEventListener('click', () => this.changePage(1));

        // Downloads
        this.dom.btnDownloadRaw.addEventListener('click', () => this.handleDownload('raw'));
        this.dom.btnDownloadFeature.addEventListener('click', () => this.handleDownload('feature'));
        this.dom.btnDownloadPlot.addEventListener('click', () => this.handleDownload('plot'));

        globalEventBus.on(EVENTS.STATE.ARCHIVE_DATA_UPDATED, () => {
            this.render();
        });
    }

    async loadData() {
        // Ambil filter values
        const searchVal = this.dom.searchInput.value;
        const datePicker = this.dom.dateRange._flatpickr;
        let startDate = '', endDate = '';

        // Helper format date lokal
        const formatLocal = (date) => {
            const offset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() - offset).toISOString().split('T')[0];
        };

        if (datePicker && datePicker.selectedDates.length > 0) {
            startDate = formatLocal(datePicker.selectedDates[0]);
            endDate = datePicker.selectedDates.length > 1 ? formatLocal(datePicker.selectedDates[1]) : startDate;
        }

        const filters = { search: searchVal, start_date: startDate, end_date: endDate };

        // Fetch API
        try {
            const data = await fetchHistory(filters);
            store.setArchiveData(data); // Simpan ke State
            this.render();
        } catch (e) {
            Toast.show("Failed to load history.", "error");
        }
    }

    changePage(delta) {
        const data = store.archiveData;
        const maxPage = Math.ceil(data.length / CONFIG.ROWS_PER_PAGE_ARCHIVE) || 1;
        const newPage = store._data.archivePage + delta;

        if (newPage >= 1 && newPage <= maxPage) {
            store._data.archivePage = newPage;
            this.render();
        }
    }

    handleDownload(type) {
        if (!this.selectedRecord) return Toast.show("Select a recording first", "error");
        downloadRecording(type, this.selectedRecord.recording_id);
    }

    toggleSelection(record) {
        if (this.selectedRecord && this.selectedRecord.recording_id === record.recording_id) {
            // Deselect
            this.selectedRecord = null;
        } else {
            // Select
            this.selectedRecord = record;
        }
        this.updateButtonState();
        this.render();
    }

    updateButtonState() {
        const hasSelection = !!this.selectedRecord;
        this.dom.btnDownloadRaw.disabled = !hasSelection;
        this.dom.btnDownloadFeature.disabled = !hasSelection;
        this.dom.btnDownloadPlot.disabled = !hasSelection;
    }

    render() {
        const tbody = this.dom.tableBody;
        if (!tbody) return;
        tbody.innerHTML = '';

        const data = store.archiveData;
        const rowsPerPage = CONFIG.ROWS_PER_PAGE_ARCHIVE;
        const currentPage = store._data.archivePage;
        const totalPages = Math.ceil(data.length / rowsPerPage) || 1;

        // Update Pagination Info
        this.dom.totalPages.textContent = totalPages;
        this.dom.pageInput.textContent = currentPage;
        this.dom.btnPrev.disabled = (currentPage === 1);
        this.dom.btnNext.disabled = (currentPage === totalPages);

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-slate-400 italic text-sm">No recording found.</td></tr>`;
            return;
        }

        // Slice Data
        const start = (currentPage - 1) * rowsPerPage;
        const paginatedData = data.slice(start, start + rowsPerPage);

        paginatedData.forEach(rec => {
            const safeClass = (rec.classification || '').toString();
            let statusColor = 'bg-slate-100 text-slate-600 ring-slate-500/10';
            if (safeClass === 'Normal') statusColor = 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
            else if (['Abnormal', 'Aritmia', 'Berpotensi'].some(x => safeClass.includes(x))) statusColor = 'bg-rose-50 text-rose-700 ring-rose-600/20';

            const isSelected = this.selectedRecord?.recording_id === rec.recording_id;

            const tr = document.createElement('tr');
            tr.className = `cursor-pointer transition-colors group border-b border-slate-50 h-9 text-xs leading-none ${isSelected ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50'}`;

            tr.innerHTML = `
                <td class="px-6 py-1.5 text-slate-500 font-mono whitespace-nowrap align-middle">${formatDate(rec.timestamp)}</td>
                <td class="px-6 py-1.5 font-medium text-slate-900 align-middle">${escapeHtml(rec.device_id)}</td>
                <td class="px-6 py-1.5 text-slate-600 font-mono align-middle">${escapeHtml(rec.subject_id)}</td>
                <td class="px-6 py-1.5 font-bold text-slate-700 truncate max-w-[140px] align-middle">${escapeHtml(rec.patient_name)}</td>
                <td class="px-6 py-1.5 align-middle"><span class="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset uppercase tracking-wide ${statusColor}">${escapeHtml(rec.classification)}</span></td>
            `;

            tr.onclick = () => this.toggleSelection(rec);
            tbody.appendChild(tr);
        });
    }
}