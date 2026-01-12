import { calculateAge } from '../utils/Helpers.js';
import { Toast } from './Toast.js';

export class PatientModal {
    constructor(onSubmitCallback) {
        this.modal = document.getElementById('patientModal');
        this.onSubmit = onSubmitCallback;
        this.dobPicker = null;

        this.initEventListeners();
        this.initDatePicker();
    }

    initEventListeners() {
        // Tombol Close (Cancel & X)
        const btnCancel = document.getElementById('modal-cancel');
        const btnCancelX = document.getElementById('modal-cancel-x');
        const btnSubmit = document.getElementById('modal-submit');

        if (btnCancel) btnCancel.addEventListener('click', () => this.hide());
        if (btnCancelX) btnCancelX.addEventListener('click', () => this.hide());

        // Tombol Submit
        if (btnSubmit) btnSubmit.addEventListener('click', () => this.handleSubmit());
    }

    initDatePicker() {
        const modalDob = document.getElementById("modal-dob");
        if (modalDob && window.flatpickr) {
            this.dobPicker = flatpickr(modalDob, {
                dateFormat: "Y-m-d",
                altInput: true,
                altFormat: "j F Y",
                maxDate: "today",
                onChange: (selectedDates, dateStr) => {
                    if (dateStr) {
                        const age = calculateAge(dateStr);
                        document.getElementById('modal-age').value = age;
                        this.animateAgeChange();
                    }
                }
            });
        }
    }

    animateAgeChange() {
        const ageContainer = document.getElementById('age-display-container');
        if (ageContainer) {
            ageContainer.classList.remove('age-pop');
            void ageContainer.offsetWidth; // Trigger reflow
            ageContainer.classList.add('age-pop');
        }
    }

    show() {
        this.modal.classList.remove('hidden');
    }

    hide() {
        this.modal.classList.add('hidden');
        this.resetForm();
    }

    resetForm() {
        document.getElementById('modal-subject').value = "";
        document.getElementById('modal-name').value = "";
        document.getElementById('modal-pob').value = "";
        document.getElementById('modal-age').value = "";
        if (this.dobPicker) this.dobPicker.clear();
    }

    handleSubmit() {
        const nik = document.getElementById('modal-subject').value.trim();
        const name = document.getElementById('modal-name').value.trim();
        const pob = document.getElementById('modal-pob').value.trim();
        const dob = document.getElementById('modal-dob').value.trim();
        const age = document.getElementById('modal-age').value;
        const gender = document.getElementById('modal-gender').value;
        const riwayat = document.getElementById('modal-riwayat').value;

        if (!nik || !name || !pob || !dob) {
            Toast.show("Please complete all fields.", "error");
            return;
        }

        const patientData = { nik, name, pob, dob, age, gender, riwayat };

        // Kirim data ke Caller (biasanya MonitorView)
        if (this.onSubmit) {
            this.onSubmit(patientData);
        }

        this.hide();
        Toast.show("Session created. Ready to record.");
    }
}