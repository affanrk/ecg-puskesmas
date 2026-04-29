import traceback
from typing import List
from fastapi import APIRouter, Depends, HTTPException

from core.dependencies import get_location_repository
from repositories.location import LocationRepository
from schemas.location import LocationPublicResponse
from schemas.common import GenericResponse, ApiStatus
from core.exceptions import AppException
from utils import logger

router = APIRouter()


@router.get("/locations", response_model=GenericResponse[List[LocationPublicResponse]])
def get_public_locations(
    location_repo: LocationRepository = Depends(get_location_repository),
):
    try:
        locations = location_repo.list_public()
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=locations,
            message="Locations retrieved successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[PublicEndpoint] Unexpected error in get_public_locations: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")
