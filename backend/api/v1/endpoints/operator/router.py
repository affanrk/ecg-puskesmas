from typing import Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
import traceback

from core.dependencies import (
    get_activated_operator_user,
    get_patient_repository,
)
from models import TbMUser
from schemas.patient import (
    WalkinPatientCreate,
    WalkinPatientResponse,
)
from schemas.common import GenericResponse, PaginatedData, ApiStatus
from repositories.patient import PatientRepository
from utils import logger
from core.exceptions import AppException

router = APIRouter()


@router.post(
    "/patients",
    response_model=GenericResponse[WalkinPatientResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a walk-in patient profile",
)
async def create_walkin_patient(
    patient_in: WalkinPatientCreate,
    current_user: TbMUser = Depends(get_activated_operator_user),
    patient_repo: PatientRepository = Depends(get_patient_repository),
):

    operator_id = None
    operator_name = current_user.username

    op_profile = getattr(current_user, "operator_profile", None)
    if op_profile is not None:
        op_id = getattr(op_profile, "id", None)
        if op_id:
            operator_id = str(op_id)

        op_fullname = getattr(op_profile, "full_name", None)
        if op_fullname:
            operator_name = op_fullname

    if operator_id is None:
        operator_id = str(current_user.id)

    try:
        patient = patient_repo.create_walkin_patient(
            patient_in=patient_in,
            operator_id=operator_id,
            operator_name=str(operator_name),
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=patient,
            message="Walk-in patient created successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[OperatorEndpoint] Failed to create walk-in patient: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get(
    "/patients",
    response_model=GenericResponse[PaginatedData[WalkinPatientResponse]],
    status_code=status.HTTP_200_OK,
    summary="List all patients",
)
async def get_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by Name or NIK"),
    patient_status: Optional[str] = Query(
        None, alias="status", description="Filter by patient status"
    ),
    current_user: TbMUser = Depends(get_activated_operator_user),
    patient_repo: PatientRepository = Depends(get_patient_repository),
):

    try:
        patients, total = patient_repo.list_all_patients(
            skip=skip,
            limit=limit,
            search=search,
            status=patient_status,
            only_walkins=False,
        )

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=PaginatedData(items=patients, total=total, limit=limit, skip=skip),
            message="Patients retrieved successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[OperatorEndpoint] Failed to retrieve patients: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")
