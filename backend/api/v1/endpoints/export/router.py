import asyncio
import pandas as pd
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.responses import StreamingResponse

from repositories.session import SessionRepository
from repositories.raw_data import RawDataRepository
from repositories.raw_data.mobile_repository import RawDataMobileRepository
from services import plot_generator
from core.dependencies import get_session_repository, get_current_user
from core import SessionLocal, RecordingNotFoundException, AppException
from utils import logger
from models import TbMUser

router = APIRouter()

plot_executor = ThreadPoolExecutor(max_workers=2)


@router.get("/raw/{recording_id}")
async def export_raw_ecg_data(
    recording_id: str = Path(..., max_length=100, description="Recording identifier"),
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_current_user),
):
    logger.info(f"[Export] Raw data export requested for Recording ID: {recording_id}")
    session = session_repo.find_by_recording_id_or_fail(recording_id)

    db = SessionLocal()
    try:
        if session.created_by == "MOBILE":
            raw_repo = RawDataMobileRepository(db)
        else:
            raw_repo = RawDataRepository(db)

        rows = raw_repo.find_by_recording_id(recording_id)

        if not rows:
            raise RecordingNotFoundException(recording_id)

        df = pd.DataFrame(
            [
                {
                    "timestamp": row.created_dt.isoformat(),
                    "recording_id": row.recording_id,
                    "lead_I_mV": row.mv_lead_I,
                    "lead_II_mV": row.mv_lead_II,
                    "lead_III_mV": row.mv_lead_III,
                    "avF_mV": row.mv_avF,
                    "v1_mV": row.mv_v1,
                    "raw_adc_I": row.raw_lead_I,
                    "raw_adc_II": row.raw_lead_II,
                    "raw_adc_v1": row.raw_v1,
                }
                for row in rows
            ]
        )

        csv_data = df.to_csv(index=False)
        filename = f"ecg_raw_{recording_id}.csv"

        logger.info(
            f"[Export] Successfully generated CSV for Recording ID: {recording_id}"
        )
        return StreamingResponse(
            iter([csv_data]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except (HTTPException, AppException):
        raise
    except Exception:
        raise
    finally:
        db.close()


@router.get("/features/{recording_id}")
async def export_analysis_features(
    recording_id: str = Path(..., max_length=100, description="Recording identifier"),
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_current_user),
):
    logger.info(f"[Export] Features export requested for Recording ID: {recording_id}")
    session = session_repo.find_by_recording_id_or_fail(recording_id)

    feature_data = {
        "recording_id": recording_id,
        "user_id": session.user_id,
        "timestamp": session.created_dt.isoformat(),
        "classification": session.classification_result,
        "confidence": session.confidence_score,
        "bpm": session.avg_bpm,
        "avg_rr_ms": session.avg_rr_ms,
        "avg_pr_ms": session.avg_pr_ms,
        "avg_qs_ms": session.avg_qs_ms,
        "avg_qtc_ms": session.avg_qtc_ms,
        "avg_st_ms": session.avg_st_ms,
        "rs_ratio_v1": session.rs_ratio_v1,
        "analyzed_by": session.changed_by,
    }

    df = pd.DataFrame([feature_data])
    csv_data = df.to_csv(index=False)
    filename = f"ecg_features_{recording_id}.csv"

    logger.info(
        f"[Export] Successfully generated features CSV for Recording ID: {recording_id}"
    )
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/plot/{recording_id}")
async def export_ecg_chart(
    recording_id: str = Path(..., max_length=100, description="Recording identifier"),
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_current_user),
):
    logger.info(f"[Export] ECG plot export requested for Recording ID: {recording_id}")
    session_repo.find_by_recording_id_or_fail(recording_id)

    loop = asyncio.get_running_loop()

    try:
        buf = await loop.run_in_executor(
            plot_executor, plot_generator.generate_ecg_plot, recording_id
        )

        if not buf:
            raise HTTPException(
                status_code=404,
                detail="Could not generate plot. Data may be insufficient.",
            )

        filename = f"ecg_chart_{recording_id}.png"

        logger.info(
            f"[Export] Successfully generated plot for Recording ID: {recording_id}"
        )
        return StreamingResponse(
            buf,
            media_type="image/png",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except (HTTPException, AppException):
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to generate plot")


@router.get("/complete/{recording_id}")
async def export_complete_package(
    recording_id: str,
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_current_user),
):
    raise HTTPException(
        status_code=501, detail="Complete package export not yet implemented"
    )


@router.get("/batch")
async def export_batch_recordings(
    recording_ids: str,
    format: str = "csv",
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_current_user),
):
    raise HTTPException(status_code=501, detail="Batch export not yet implemented")
