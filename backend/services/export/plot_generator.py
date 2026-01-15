"""
Plot generation service - refactored from plotter.py
Generates ECG chart images for export.
Now uses repositories and better error handling.
"""
import io
import matplotlib
matplotlib.use('Agg')  # Non-GUI backend for server environments
import matplotlib.pyplot as plt
import pandas as pd
from typing import Optional
from sqlalchemy.orm import Session

from services.analysis.signal_processor import signal_processor
from repositories.session import RawDataRepository
from core.database import SessionLocal
from core.exceptions import RecordingNotFoundException
from utils.constants import SAMPLING_RATE, PLOT_DPI, PLOT_FIGURE_SIZE
from utils.logger import logger


class PlotGeneratorService:
    """
    Generates ECG chart images from recording data.
    CPU-bound operations should be run in thread pool.
    """
    
    def __init__(
        self,
        sampling_rate: int = SAMPLING_RATE,
        dpi: int = PLOT_DPI,
        figure_size: tuple = PLOT_FIGURE_SIZE
    ):
        self.sampling_rate = sampling_rate
        self.dpi = dpi
        self.figure_size = figure_size
        
    # ========================================================================
    # MAIN PLOT GENERATION
    # ========================================================================
    
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
            # 1. Fetch raw data
            raw_data = self._fetch_raw_data(db, recording_id)
            
            if raw_data.empty:
                raise RecordingNotFoundException(recording_id)
                
            # 2. Prepare data
            time_axis, lead_i, lead_ii, lead_v1 = self._prepare_plot_data(
                raw_data
            )
            
            # 3. Generate plot
            buf = self._create_plot(time_axis, lead_i, lead_ii, lead_v1)
            
            return buf
            
        except RecordingNotFoundException:
            raise
        except Exception as e:
            logger.error(f"[PlotGenerator] Failed to generate plot: {e}")
            return None
        finally:
            db.close()
            # Ensure matplotlib resources are cleaned up
            plt.close('all')
            
    # ========================================================================
    # DATA FETCHING
    # ========================================================================
    
    def _fetch_raw_data(
        self,
        db: Session,
        recording_id: str
    ) -> pd.DataFrame:
        """
        Fetch raw ECG data from database.
        """
        raw_repo = RawDataRepository(db)
        rows = raw_repo.get_raw_data_for_recording(recording_id)
        
        if not rows:
            return pd.DataFrame()
            
        # Convert to DataFrame
        df = pd.DataFrame([{
            'lead_I': r.mv_lead_I,
            'lead_II': r.mv_lead_II,
            'v1': r.mv_v1
        } for r in rows])
        
        return df
        
    # ========================================================================
    # DATA PREPARATION
    # ========================================================================
    
    def _prepare_plot_data(
        self,
        df: pd.DataFrame
    ) -> tuple:
        """
        Prepare ECG data for plotting.
        Applies DSP filters for clean visualization.
        
        Returns:
            Tuple of (time_axis, lead_i, lead_ii, lead_v1)
        """
        # Create time axis
        time_axis = [i / self.sampling_rate for i in range(len(df))]
        
        # Extract signals
        raw_i = df['lead_I'].values
        raw_ii = df['lead_II'].values
        raw_v1 = df['v1'].values
        
        # Apply DSP filters
        lead_i, lead_ii, lead_v1 = self._apply_filters_safe(
            raw_i, raw_ii, raw_v1
        )
        
        return time_axis, lead_i, lead_ii, lead_v1
        
    def _apply_filters_safe(
        self,
        raw_i: list,
        raw_ii: list,
        raw_v1: list
    ) -> tuple:
        """
        Apply DSP filters with fallback to raw data on failure.
        """
        try:
            if len(raw_i) > 20:
                lead_i = signal_processor.apply_filters(raw_i)
                lead_ii = signal_processor.apply_filters(raw_ii)
                lead_v1 = signal_processor.apply_filters(raw_v1)
                return lead_i, lead_ii, lead_v1
        except Exception as e:
            logger.warning(f"[PlotGenerator] Filter failed, using raw: {e}")
            
        return raw_i, raw_ii, raw_v1
        
    # ========================================================================
    # PLOT CREATION
    # ========================================================================
    
    def _create_plot(
        self,
        time_axis: list,
        lead_i: list,
        lead_ii: list,
        lead_v1: list
    ) -> io.BytesIO:
        """
        Create matplotlib figure and save to buffer.
        """
        # Create figure with 3 subplots
        fig, (ax1, ax2, ax3) = plt.subplots(
            3, 1,
            figsize=self.figure_size,
            sharex=True
        )
        
        plt.subplots_adjust(hspace=0.2)
        
        # Style each subplot
        self._style_subplot(ax1, "Lead I (mV)", time_axis, lead_i, '#3b82f6')
        self._style_subplot(ax2, "Lead II (mV)", time_axis, lead_ii, '#10b981')
        self._style_subplot(ax3, "Lead V1 (mV)", time_axis, lead_v1, '#f59e0b')
        
        # Set x-axis label
        ax3.set_xlabel('Time (seconds)', fontsize=10, fontweight='bold')
        
        # Optimize layout
        plt.margins(x=0.01)
        plt.tight_layout()
        
        # Save to buffer
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=self.dpi, bbox_inches='tight')
        buf.seek(0)
        
        # Close figure to free memory
        plt.close(fig)
        
        return buf
        
    def _style_subplot(
        self,
        ax: plt.Axes,
        title: str,
        x_data: list,
        y_data: list,
        color: str
    ):
        """
        Apply consistent styling to a subplot.
        """
        # Plot data
        ax.plot(x_data, y_data, color=color, linewidth=1.2)
        
        # Title and labels
        ax.set_title(
            title,
            loc='left',
            fontsize=11,
            fontweight='bold',
            pad=8
        )
        ax.set_ylabel('mV', fontsize=9)
        
        # Grid
        ax.grid(
            True,
            which='major',
            linestyle='-',
            linewidth=0.5,
            color='#e2e8f0'
        )
        
        # Background and spines
        ax.set_facecolor('#ffffff')
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        
    # ========================================================================
    # UTILITY METHODS
    # ========================================================================
    
    def generate_multi_recording_plot(
        self,
        recording_ids: list[str],
        layout: str = "vertical"
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
        # TODO: Implement multi-recording comparison plot
        # This is a nice-to-have feature for future enhancement
        raise NotImplementedError(
            "Multi-recording plots not yet implemented"
        )


# Global singleton instance
plot_generator = PlotGeneratorService()
