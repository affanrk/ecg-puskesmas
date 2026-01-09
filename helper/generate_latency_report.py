import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

# KONFIGURASI
FILENAME = '../../../ecg_performance_metrics_3lead_202512291018.csv'
OUTPUT_IMG = 'Laporan_1_Latensi.png'

# 1. Load Data
print("Memproses data Latensi...")
df = pd.read_csv(FILENAME)
df['timestamp'] = pd.to_datetime(df['timestamp'])
df.set_index('timestamp', inplace=True)

# 2. Resample (5 Menit) untuk melihat Tren vs Spike
df_resampled = df.resample('5Min').agg({
    'latency_ms': ['mean', 'max']
})
df_resampled.columns = ['_'.join(col).strip() for col in df_resampled.columns.values]

# Statistik
avg_lat = df['latency_ms'].mean()
max_lat = df['latency_ms'].max()

# 3. Plotting
plt.style.use('seaborn-v0_8-whitegrid')
fig, (ax_plot, ax_text) = plt.subplots(1, 2, figsize=(12, 5), gridspec_kw={'width_ratios': [3, 1]})
plt.subplots_adjust(wspace=0.05)

# Garis Rata-rata (Biru Tua)
ax_plot.plot(df_resampled.index, df_resampled['latency_ms_mean'], color='#0ea5e9', label='Rata-rata Latensi', linewidth=2)
# Bayangan Spike (Biru Muda) - Ini menunjukkan buffering
ax_plot.fill_between(df_resampled.index, df_resampled['latency_ms_mean'], df_resampled['latency_ms_max'], color='#bae6fd', alpha=0.5, label='Max Spikes (Buffering)')

# Styling
ax_plot.set_title('1. Network Latency Endurance', fontsize=14, fontweight='bold', loc='left', color='#334155')
ax_plot.set_ylabel('Latency (ms)')
ax_plot.axhline(y=300, color='#ef4444', linestyle='--', linewidth=1, label='Target Real-time (300ms)')
ax_plot.legend(loc='upper right')
ax_plot.grid(True, linestyle='--', alpha=0.6)
ax_plot.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))

# Summary Box (Samping)
summary_text = (
    f"LATENCY SUMMARY\n"
    f"----------------\n"
    f"Avg: {avg_lat:.1f} ms\n"
    f"Max Spike: {max_lat:.0f} ms\n\n"
    f"Mode: Store & Forward\n"
    f"Sistem melakukan\n"
    f"buffering saat sinyal\n"
    f"buruk, data aman."
)
ax_text.axis('off')
ax_text.text(0.1, 0.5, summary_text, fontsize=11, verticalalignment='center', 
             bbox=dict(boxstyle="round,pad=1", facecolor='#0ea5e9', alpha=0.1, edgecolor='#0ea5e9'))

plt.tight_layout()
plt.savefig(OUTPUT_IMG, dpi=300, bbox_inches='tight')
print(f"Grafik tersimpan: {OUTPUT_IMG}")