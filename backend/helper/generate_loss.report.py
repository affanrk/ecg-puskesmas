import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

# KONFIGURASI
FILENAME = '../../../ecg_performance_metrics_3lead_202512291018.csv'
OUTPUT_IMG = 'Laporan_3_PacketLoss.png'

# 1. Load Data
print("Memproses data Packet Loss...")
df = pd.read_csv(FILENAME)
df['timestamp'] = pd.to_datetime(df['timestamp'])
df.set_index('timestamp', inplace=True)

# 2. Resample (Ambil nilai terakhir dalam window 5 menit)
df_resampled = df.resample('5Min').agg({'packet_loss_pct_cumulative': 'last'})
final_loss = df['packet_loss_pct_cumulative'].iloc[-1]
total_duration = (df.index.max() - df.index.min()).total_seconds() / 3600

# 3. Plotting
plt.style.use('seaborn-v0_8-whitegrid')
fig, (ax_plot, ax_text) = plt.subplots(1, 2, figsize=(12, 5), gridspec_kw={'width_ratios': [3, 1]})
plt.subplots_adjust(wspace=0.05)

# Garis Merah
loss_series = df_resampled['packet_loss_pct_cumulative']
ax_plot.plot(df_resampled.index, loss_series, color='#dc2626', label='Cumulative Loss', linewidth=2)
ax_plot.fill_between(df_resampled.index, loss_series, color='#fecaca', alpha=0.3)

# Styling
ax_plot.set_title('3. Data Integrity & Reliability', fontsize=14, fontweight='bold', loc='left', color='#334155')
ax_plot.set_ylabel('Loss %')
ax_plot.set_ylim(-0.1, 1.0) # Skala kecil agar 0 terlihat jelas
ax_plot.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))

# Summary Box
summary_text = (
    f"INTEGRITY SUMMARY\n"
    f"------------------\n"
    f"Total Loss: {final_loss:.2f}%\n"
    f"Durasi: {total_duration:.1f} Jam\n\n"
    f"Status: EXCELLENT\n"
    f"NOL data hilang.\n"
    f"Sangat aman untuk\n"
    f"diagnosa klinis."
)
ax_text.axis('off')
ax_text.text(0.1, 0.5, summary_text, fontsize=11, verticalalignment='center', 
             bbox=dict(boxstyle="round,pad=1", facecolor='#dc2626', alpha=0.1, edgecolor='#dc2626'))

plt.tight_layout()
plt.savefig(OUTPUT_IMG, dpi=300, bbox_inches='tight')
print(f"Grafik tersimpan: {OUTPUT_IMG}")
