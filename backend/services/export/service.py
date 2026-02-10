"""
Plot generation service - refactored from plotter.py
Generates ECG chart images for export.
Now uses repositories and better error handling.
"""

import io
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from typing import Optional
from sqlalchemy.orm import Session

from ..analysis import signal_processor
from repositories.raw_data import RawDataRepository
from repositories.raw_data.mobile_repository import RawDataMobileRepository
from repositories.session import SessionRepository
from core.database import SessionLocal
from core.exceptions import RecordingNotFoundException
from utils import logger, SAMPLING_RATE, PLOT_DPI, PLOT_FIGURE_SIZE


class PlotGeneratorService:
    """
    Generates ECG chart images from recording data.
    CPU-bound operations should be run in thread pool.
    """

    def __init__(
        self,
        sampling_rate: int = SAMPLING_RATE,
        dpi: int = PLOT_DPI,
        figure_size: tuple = PLOT_FIGURE_SIZE,
    ):
        self.sampling_rate = sampling_rate
        self.dpi = dpi
        self.figure_size = figure_size

    def generate_ecg_plot(self, recording_id: str) -> Optional[io.BytesIO]:
        """
        Generate ECG plot image for a recording.

        IMPORTANT: This is CPU-intensive and should be called via:
        - asyncio.run_in_executor() for async contexts
        - ThreadPoolExecutor for sync contexts

        Args:
            recording_id: Recording identifier

        Returns:
            BytesIO buffer with PNG image, or None if failed

        Raises:
            RecordingNotFoundException: If recording data not found
        """
        db = SessionLocal()

        try:

            raw_data = self._fetch_raw_data(db, recording_id)

            if raw_data.empty:
                raise RecordingNotFoundException(recording_id)

            time_axis, lead_i, lead_ii, lead_iii, lead_avf, lead_v1 = (
                self._prepare_plot_data(raw_data)
            )

            buf = self._create_plot(
                time_axis, lead_i, lead_ii, lead_iii, lead_avf, lead_v1
            )

            return buf

        except RecordingNotFoundException:
            raise
        except Exception as e:
            logger.error(f"[PlotGenerator] Failed to generate plot: {e}")
            return None
        finally:
            db.close()

            plt.close("all")

    def _fetch_raw_data(self, db: Session, recording_id: str) -> pd.DataFrame:
        """
        Fetch raw ECG data from database.
        """
        session_repo = SessionRepository(db)
        session = session_repo.get(recording_id)

        if not session:
            return pd.DataFrame()

        if session.created_by == "MOBILE":
            raw_repo = RawDataMobileRepository(db)
        else:
            raw_repo = RawDataRepository(db)

        rows = raw_repo.find_by_recording_id(recording_id)

        if not rows:
            return pd.DataFrame()

        df = pd.DataFrame(
            [
                {
                    "lead_I": r.mv_lead_I,
                    "lead_II": r.mv_lead_II,
                    "lead_III": r.mv_lead_III,
                    "avF": r.mv_avF,
                    "v1": r.mv_v1,
                }
                for r in rows
            ]
        )

        return df

    def _prepare_plot_data(self, df: pd.DataFrame) -> tuple:
        """
        Prepare ECG data for plotting.
        Applies DSP filters for clean visualization.

        Returns:
            Tuple of (time_axis, lead_i, lead_ii, lead_iii, lead_avf, lead_v1)
        """

        time_axis = [i / self.sampling_rate for i in range(len(df))]

        raw_i = df["lead_I"].values
        raw_ii = df["lead_II"].values
        raw_iii = df["lead_III"].values
        raw_avf = df["avF"].values
        raw_v1 = df["v1"].values

        lead_i, lead_ii, lead_iii, lead_avf, lead_v1 = self._apply_filters_safe(
            raw_i, raw_ii, raw_iii, raw_avf, raw_v1
        )

        return time_axis, lead_i, lead_ii, lead_iii, lead_avf, lead_v1

    def _apply_filters_safe(
        self,
        raw_i: np.ndarray,
        raw_ii: np.ndarray,
        raw_iii: np.ndarray,
        raw_avf: np.ndarray,
        raw_v1: np.ndarray,
    ) -> tuple:
        """
        Apply DSP filters with fallback to raw data on failure.
        """
        try:
            if len(raw_i) > 20:
                lead_i = signal_processor.apply_filters(raw_i)
                lead_ii = signal_processor.apply_filters(raw_ii)
                lead_iii = signal_processor.apply_filters(raw_iii)
                lead_avf = signal_processor.apply_filters(raw_avf)
                lead_v1 = signal_processor.apply_filters(raw_v1)
                return lead_i, lead_ii, lead_iii, lead_avf, lead_v1
        except Exception as e:
            logger.warning(f"[PlotGenerator] Filter failed, using raw: {e}")

        return raw_i, raw_ii, raw_iii, raw_avf, raw_v1

    def _create_plot(
        self,
        time_axis: list,
        lead_i: list,
        lead_ii: list,
        lead_iii: list,
        lead_avf: list,
        lead_v1: list,
    ) -> io.BytesIO:
        """
        Create matplotlib figure and save to buffer.
        """

        fig, (ax1, ax2, ax3, ax4, ax5) = plt.subplots(
            5, 1, figsize=(self.figure_size[0], self.figure_size[1] * 1.5), sharex=True
        )

        plt.subplots_adjust(hspace=0.2)

        self._style_subplot(ax1, "Lead I (mV)", time_axis, lead_i, "#3b82f6")
        self._style_subplot(ax2, "Lead II (mV)", time_axis, lead_ii, "#10b981")
        self._style_subplot(ax3, "Lead III (mV)", time_axis, lead_iii, "#8b5cf6")
        self._style_subplot(ax4, "avF (mV)", time_axis, lead_avf, "#ec4899")
        self._style_subplot(ax5, "Lead V1 (mV)", time_axis, lead_v1, "#f59e0b")

        ax5.set_xlabel("Time (seconds)", fontsize=10, fontweight="bold")

        plt.margins(x=0.01)
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=self.dpi, bbox_inches="tight")
        buf.seek(0)

        plt.close(fig)

        return buf

    def _style_subplot(
        self, ax: plt.Axes, title: str, x_data: list, y_data: list, color: str
    ):
        """
        Apply consistent styling to a subplot.
        """

        ax.plot(x_data, y_data, color=color, linewidth=1.2)

        ax.set_title(title, loc="left", fontsize=11, fontweight="bold", pad=8)
        ax.set_ylabel("mV", fontsize=9)

        ax.grid(True, which="major", linestyle="-", linewidth=0.5, color="#e2e8f0")

        ax.set_facecolor("#ffffff")
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)

    def generate_multi_recording_plot(
        self, recording_ids: list[str], layout: str = "vertical"
    ) -> Optional[io.BytesIO]:
        """
        Generate combined plot for multiple recordings.
        Useful for comparison views.

        Args:
            recording_ids: List of recording IDs
            layout: "vertical" or "horizontal"

        Returns:
            BytesIO buffer with combined plot
        """

        raise NotImplementedError("Multi-recording plots not yet implemented")


plot_generator = PlotGeneratorService()
