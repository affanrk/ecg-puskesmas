import asyncio
import pandas as pd
import traceback
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.responses import StreamingResponse

from repositories.session import SessionRepository
from repositories.raw_data import (
    RawData5LeadsRepository,
    RawData12LeadsRepository,
    RawData5LeadsMobileRepository,
    RawData12LeadsMobileRepository,
    BaseRawDataRepository,
)
from services import plot_generator
from core.dependencies import (
    get_session_repository,
    get_activated_user,
    verify_session_access,
)
from core import SessionLocal, RecordingNotFoundException, AppException
from utils import logger
from models import TbMUser

router = APIRouter()

plot_executor = ThreadPoolExecutor(max_workers=2)


@router.get("/raw/{recording_id}")
async def export_raw_ecg_data(
    recording_id: str = Path(..., max_length=100, description="Recording identifier"),
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_activated_user),
):
    try:
        logger.info(
            f"[Export] Raw data export requested for Recording ID: {recording_id}"
        )
        session = session_repo.find_by_recording_id_or_fail(recording_id)
        verify_session_access(str(session.user_id), current_user)

        db = SessionLocal()
        try:
            is_12_leads = False
            if session.created_by == "MOBILE":
                raw_repo_12: BaseRawDataRepository = RawData12LeadsMobileRepository(db)
            else:
                raw_repo_12 = RawData12LeadsRepository(db)

            rows = raw_repo_12.find_by_recording_id(recording_id)

            if rows:
                is_12_leads = True
            else:
                if session.created_by == "MOBILE":
                    raw_repo_5: BaseRawDataRepository = RawData5LeadsMobileRepository(
                        db
                    )
                else:
                    raw_repo_5 = RawData5LeadsRepository(db)
                rows = raw_repo_5.find_by_recording_id(recording_id)

            if not rows:
                raise RecordingNotFoundException(recording_id)

            if is_12_leads:
                df = pd.DataFrame(
                    [
                        {
                            "timestamp": (
                                row.created_dt.isoformat() if row.created_dt else ""
                            ),
                            "recording_id": row.recording_id,
                            "lead_i_mv": row.mv_lead_i,
                            "lead_ii_mv": row.mv_lead_ii,
                            "lead_iii_mv": row.mv_lead_iii,
                            "avr_mv": row.mv_avr,
                            "avl_mv": row.mv_avl,
                            "avf_mv": row.mv_avf,
                            "v1_mv": row.mv_v1,
                            "v2_mv": row.mv_v2,
                            "v3_mv": row.mv_v3,
                            "v4_mv": row.mv_v4,
                            "v5_mv": row.mv_v5,
                            "v6_mv": row.mv_v6,
                        }
                        for row in rows
                    ]
                )
            else:
                df = pd.DataFrame(
                    [
                        {
                            "timestamp": (
                                row.created_dt.isoformat() if row.created_dt else ""
                            ),
                            "recording_id": row.recording_id,
                            "lead_i_mv": row.mv_lead_i,
                            "lead_ii_mv": row.mv_lead_ii,
                            "lead_iii_mv": row.mv_lead_iii,
                            "avf_mv": row.mv_avf,
                            "v1_mv": row.mv_v1,
                            "raw_adc_i": row.raw_lead_i,
                            "raw_adc_ii": row.raw_lead_ii,
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
        finally:
            db.close()
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[ExportEndpoint] Unexpected error in export_raw_ecg_data: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/features/{recording_id}")
async def export_analysis_features(
    recording_id: str = Path(..., max_length=100, description="Recording identifier"),
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_activated_user),
):
    try:
        logger.info(
            f"[Export] Features export requested for Recording ID: {recording_id}"
        )
        session = session_repo.find_by_recording_id_or_fail(recording_id)
        verify_session_access(str(session.user_id), current_user)

        params = {str(p.lead_name): p for p in session.parameters}
        lead_ii = params.get("lead_ii")
        lead_i = params.get("lead_i")
        v1 = params.get("v1")

        feature_data = {
            "recording_id": recording_id,
            "user_id": session.user_id,
            "timestamp": session.created_dt.isoformat() if session.created_dt else "",
            "classification": session.classification_result,
            "confidence": session.confidence_score,
            "bpm": lead_ii.heart_rate_bpm if lead_ii else None,
            "avg_rr_ms": lead_ii.rr_ms if lead_ii else None,
            "avg_pr_ms": lead_ii.pr_ms if lead_ii else None,
            "avg_qs_ms": lead_ii.qrs_ms if lead_ii else None,
            "avg_qtc_ms": lead_ii.qtc_ms if lead_ii else None,
            "avg_st_ms": lead_i.st_amplitude_mv if lead_i else None,
            "rs_ratio_v1": v1.rs_ratio if v1 else None,
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
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[ExportEndpoint] Unexpected error in export_analysis_features: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/plot/{recording_id}")
async def export_ecg_chart(
    recording_id: str = Path(..., max_length=100, description="Recording identifier"),
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_activated_user),
):
    try:
        logger.info(
            f"[Export] ECG plot export requested for Recording ID: {recording_id}"
        )
        session = session_repo.find_by_recording_id_or_fail(recording_id)
        verify_session_access(str(session.user_id), current_user)

        loop = asyncio.get_running_loop()

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
    except Exception as e:
        logger.error(f"[ExportEndpoint] Unexpected error in export_ecg_chart: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/complete/{recording_id}")
async def export_complete_package(
    recording_id: str,
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_activated_user),
):
    try:
        raise HTTPException(
            status_code=501, detail="Complete package export not yet implemented"
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[ExportEndpoint] Unexpected error in export_complete_package: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/batch")
async def export_batch_recordings(
    recording_ids: str,
    format: str = "csv",
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_activated_user),
):
    try:
        raise HTTPException(status_code=501, detail="Batch export not yet implemented")
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[ExportEndpoint] Unexpected error in export_batch_recordings: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")
