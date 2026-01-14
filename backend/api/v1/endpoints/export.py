"""
Export endpoints - refactored from download.py
Handles CSV and image exports for recordings.
Now uses services and repositories for better separation.
"""
import asyncio
import pandas as pd
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from backend.repositories.session import SessionRepository, RawDataRepository
from backend.services.export.plot_generator import plot_generator
from backend.core.dependencies import get_session_repository
from backend.core.database import SessionLocal
from backend.core.exceptions import RecordingNotFoundException
from backend.utils.logger import logger


router = APIRouter()

# Thread pool for CPU-bound plotting operations
plot_executor = ThreadPoolExecutor(max_workers=2)


@router.get("/raw/{recording_id}")
async def export_raw_ecg_data(
    recording_id: str,
    session_repo: SessionRepository = Depends(get_session_repository)
):
    """
    Export raw ECG signal data as CSV.
    
    **Path Parameters:**
    - `recording_id`: Recording identifier
    
    **Returns:**
    CSV file with columns:
    - `timestamp`: ISO timestamp
    - `recording_id`: Recording ID
    - `lead_I_mV`: Lead I calibrated value
    - `lead_II_mV`: Lead II calibrated value
    - `v1_mV`: V1 calibrated value
    - `raw_adc_I`: Lead I raw ADC value
    - `raw_adc_II`: Lead II raw ADC value
    - `raw_adc_v1`: V1 raw ADC value
    
    **Raises:**
    - `404`: Recording not found
    
    **Example:**
    ```
    GET /api/export/raw/123e4567-e89b-12d3-a456-426614174000
    ```
    Downloads: `ecg_raw_123e4567-e89b-12d3-a456-426614174000.csv`
    """
    # Verify recording exists
    session_repo.get_by_recording_id_or_fail(recording_id)
    
    # Fetch raw data
    db = SessionLocal()
    try:
        raw_repo = RawDataRepository(db)
        rows = raw_repo.get_raw_data_for_recording(recording_id)
        
        if not rows:
            raise RecordingNotFoundException(recording_id)
            
        # Convert to DataFrame
        df = pd.DataFrame([{
            'timestamp': row.created_dt.isoformat(),
            'recording_id': row.recording_id,
            'lead_I_mV': row.mv_lead_I,
            'lead_II_mV': row.mv_lead_II,
            'v1_mV': row.mv_v1,
            'raw_adc_I': row.raw_lead_I,
            'raw_adc_II': row.raw_lead_II,
            'raw_adc_v1': row.raw_v1
        } for row in rows])
        
        # Generate CSV
        csv_data = df.to_csv(index=False)
        filename = f"ecg_raw_{recording_id}.csv"
        
        return StreamingResponse(
            iter([csv_data]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    finally:
        db.close()


@router.get("/features/{recording_id}")
async def export_analysis_features(
    recording_id: str,
    session_repo: SessionRepository = Depends(get_session_repository)
):
    """
    Export analysis features and results as CSV.
    
    **Path Parameters:**
    - `recording_id`: Recording identifier
    
    **Returns:**
    CSV file with columns:
    - `recording_id`: Recording ID
    - `patient_id`: Patient identifier
    - `timestamp`: Recording timestamp
    - `classification`: AI classification result
    - `confidence`: Confidence score (0-1)
    - `bpm`: Heart rate (beats per minute)
    - `avg_rr_ms`: Average RR interval (ms)
    - `avg_pr_ms`: Average PR interval (ms)
    - `avg_qs_ms`: Average QS interval (ms)
    - `avg_qtc_ms`: Average corrected QT interval (ms)
    - `avg_st_ms`: Average ST segment duration (ms)
    - `rs_ratio_v1`: R/S amplitude ratio in V1
    - `analyzed_by`: System/user who performed analysis
    
    **Raises:**
    - `404`: Recording not found
    
    **Example:**
    ```
    GET /api/export/features/123e4567-e89b-12d3-a456-426614174000
    ```
    Downloads: `ecg_features_123e4567-e89b-12d3-a456-426614174000.csv`
    """
    # Fetch session
    session = session_repo.get_by_recording_id_or_fail(recording_id)
    
    # Build feature data
    feature_data = {
        'recording_id': recording_id,
        'patient_id': session.patient_id,
        'timestamp': session.created_dt.isoformat(),
        'classification': session.classification_result,
        'confidence': session.confidence_score,
        'bpm': session.avg_bpm,
        'avg_rr_ms': session.avg_rr_ms,
        'avg_pr_ms': session.avg_pr_ms,
        'avg_qs_ms': session.avg_qs_ms,
        'avg_qtc_ms': session.avg_qtc_ms,
        'avg_st_ms': session.avg_st_ms,
        'rs_ratio_v1': session.rs_ratio_v1,
        'analyzed_by': session.changed_by
    }
    
    # Convert to DataFrame and CSV
    df = pd.DataFrame([feature_data])
    csv_data = df.to_csv(index=False)
    filename = f"ecg_features_{recording_id}.csv"
    
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/plot/{recording_id}")
async def export_ecg_chart(
    recording_id: str,
    session_repo: SessionRepository = Depends(get_session_repository)
):
    """
    Export ECG waveform chart as PNG image.
    
    **Path Parameters:**
    - `recording_id`: Recording identifier
    
    **Returns:**
    PNG image file with 3-lead ECG waveform plot.
    - Resolution: 150 DPI
    - Size: 24x12 inches
    - Includes DSP-filtered signals
    - Professional medical chart styling
    
    **Raises:**
    - `404`: Recording not found or insufficient data
    
    **Example:**
    ```
    GET /api/export/plot/123e4567-e89b-12d3-a456-426614174000
    ```
    Downloads: `ecg_chart_123e4567-e89b-12d3-a456-426614174000.png`
    """
    # Verify recording exists
    session_repo.get_by_recording_id_or_fail(recording_id)
    
    # Generate plot in thread pool (CPU-intensive)
    loop = asyncio.get_running_loop()
    
    try:
        buf = await loop.run_in_executor(
            plot_executor,
            plot_generator.generate_ecg_plot,
            recording_id
        )
        
        if not buf:
            raise HTTPException(
                status_code=404,
                detail="Could not generate plot. Data may be insufficient."
            )
            
        filename = f"ecg_chart_{recording_id}.png"
        
        return StreamingResponse(
            buf,
            media_type="image/png",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except RecordingNotFoundException:
        raise
    except Exception as e:
        logger.error(f"[Export] Plot generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate plot"
        )


@router.get("/complete/{recording_id}")
async def export_complete_package(
    recording_id: str,
    session_repo: SessionRepository = Depends(get_session_repository)
):
    """
    Export complete package (future enhancement).
    
    Will include:
    - Raw ECG data (CSV)
    - Analysis features (CSV)
    - ECG chart (PNG)
    - Summary report (PDF)
    
    All packaged in a ZIP file.
    
    **Status:** Not yet implemented
    
    **Path Parameters:**
    - `recording_id`: Recording identifier
    
    **Example:**
    ```
    GET /api/export/complete/123e4567-e89b-12d3-a456-426614174000
    ```
    """
    raise HTTPException(
        status_code=501,
        detail="Complete package export not yet implemented"
    )


@router.get("/batch")
async def export_batch_recordings(
    recording_ids: str,  # Comma-separated list
    format: str = "csv",
    session_repo: SessionRepository = Depends(get_session_repository)
):
    """
    Export multiple recordings in batch (future enhancement).
    
    **Query Parameters:**
    - `recording_ids`: Comma-separated recording IDs
    - `format`: Export format ("csv" or "zip")
    
    **Status:** Not yet implemented
    
    **Example:**
    ```
    GET /api/export/batch?recording_ids=id1,id2,id3&format=zip
    ```
    """
    raise HTTPException(
        status_code=501,
        detail="Batch export not yet implemented"
    )
