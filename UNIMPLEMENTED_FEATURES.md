# Daftar Fitur Belum Selesai / Belum Digunakan (Not Implemented / Error)

Dokumen ini berisi daftar fitur-fitur yang sudah memiliki kerangka kode (implemented di tingkat dasar) namun masih belum digunakan secara penuh, atau sengaja diset untuk mengembalikan error (misalnya `501 Not Implemented` atau `NotImplementedError`).

## 1. Export Data Lengkap (Complete Package ZIP)
- **Status**: Mengembalikan Error HTTP 501 (Not Implemented)
- **Lokasi Code**: `backend/api/v1/endpoints/export/router.py` pada route `GET /export/complete/{recording_id}`.
- **Keterangan**: Endpoint ini sudah terdaftar di *router* FastAPI dan didokumentasikan di `API.md`, namun implementasi di dalamnya secara *hardcode* me-raise exception `501` karena fungsi untuk mengemas raw data, AI features, dan gambar chart ke dalam file ZIP belum dibuat.

## 2. Export Batch (Banyak Rekaman Sekaligus)
- **Status**: Mengembalikan Error HTTP 501 (Not Implemented)
- **Lokasi Code**: `backend/api/v1/endpoints/export/router.py` pada route `GET /export/batch`.
- **Keterangan**: Sama seperti ekspor ZIP, endpoint ini sudah didefinisikan namun mengembalikan error 501.

## 3. Plot Grafik Multi-Rekaman (Multi-recording plots)
- **Status**: Mengembalikan Exception `NotImplementedError`
- **Lokasi Code**: `backend/services/export/service.py` di bagian pembuatan plot grafik.
- **Keterangan**: Saat sistem mencoba untuk mengekspor plot data yang terdiri dari multi-rekaman secara bersamaan, service akan memunculkan exception `raise NotImplementedError("Multi-recording plots not yet implemented")`.

## 4. Sinkronisasi Otomatis Riwayat Pasien (Global History Synchronization)
- **Status**: Terdapat di dalam kode, tetapi tidak di-trigger (Reserved)
- **Lokasi Code**: Frontend WebSocket store & `WEBSOCKET.md`
- **Keterangan**: Sinyal `history_updated` sudah didefinisikan di protokol WebSocket, namun sengaja belum digunakan secara aktif. Fitur ini dicadangkan (reserved) untuk sinkronisasi daftar riwayat pasien antar klien (front-end) di masa mendatang agar *real-time*.

## 5. Fitur Health Check Tambahan (ML Monitoring & Log Cleanup)
- **Status**: Sudah dibuat di Backend, namun tidak ada di UI Frontend maupun `API.md`
- **Lokasi Code**: `backend/api/v1/endpoints/health/router.py`
  - `GET /health/monitoring/ml`
  - `POST /health/admin/cleanup/old-logs`
- **Keterangan**: Endpoint ini sudah ada dan bisa dipanggil, namun UI Frontend saat ini belum mengkonsumsinya dan endpoint tersebut terlewat/tidak didokumentasikan di `API.md`.
