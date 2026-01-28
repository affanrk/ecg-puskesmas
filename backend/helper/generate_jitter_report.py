import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

# KONFIGURASI
FILENAME = "../../../ecg_performance_metrics_3lead_202512291018.csv"
OUTPUT_IMG = "Laporan_2_Jitter.png"

# 1. Load Data
print("Memproses data Jitter...")
df = pd.read_csv(FILENAME)
df["timestamp"] = pd.to_datetime(df["timestamp"])
df.set_index("timestamp", inplace=True)

# 2. Resample
df_resampled = df.resample("5Min").agg({"jitter_ms": "mean"})
avg_jitter = df["jitter_ms"].mean()

# 3. Plotting
plt.style.use("seaborn-v0_8-whitegrid")
fig, (ax_plot, ax_text) = plt.subplots(
    1, 2, figsize=(12, 5), gridspec_kw={"width_ratios": [3, 1]}
)
plt.subplots_adjust(wspace=0.05)

# Garis Ungu
ax_plot.plot(
    df_resampled.index,
    df_resampled["jitter_ms"],
    color="#8b5cf6",
    label="Stabilitas Jitter",
    linewidth=2,
)

# Styling
ax_plot.set_title(
    "2. Connection Stability (Jitter)",
    fontsize=14,
    fontweight="bold",
    loc="left",
    color="#334155",
)
ax_plot.set_ylabel("Jitter (ms)")
ax_plot.axhline(
    y=30, color="#f59e0b", linestyle="--", linewidth=1, label="Target Ideal (30ms)"
)
ax_plot.legend(loc="upper right")
ax_plot.grid(True, linestyle="--", alpha=0.6)
ax_plot.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))

# Summary Box
summary_text = (
    f"JITTER SUMMARY\n"
    f"----------------\n"
    f"Avg Jitter: {avg_jitter:.1f} ms\n\n"
    f"Status: Moderate\n"
    f"Fluktuasi konsisten.\n"
    f"Dapat diredam oleh\n"
    f"Jitter Buffer pada\n"
    f"sisi Aplikasi."
)
ax_text.axis("off")
ax_text.text(
    0.1,
    0.5,
    summary_text,
    fontsize=11,
    verticalalignment="center",
    bbox=dict(
        boxstyle="round,pad=1", facecolor="#8b5cf6", alpha=0.1, edgecolor="#8b5cf6"
    ),
)

plt.tight_layout()
plt.savefig(OUTPUT_IMG, dpi=300, bbox_inches="tight")
print(f"Grafik tersimpan: {OUTPUT_IMG}")
