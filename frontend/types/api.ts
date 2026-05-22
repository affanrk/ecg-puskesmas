export interface ApiValidationError {
    loc: (string | number)[];
    msg: string;
    type: string;
}

export interface ApiErrorResponse {
    error?: {
        type?: string;
        message: string;
        status_code?: number;
        details?: ApiValidationError[] | Record<string, string | string[] | number | boolean> | { field: string; message?: string; error?: string };
    };
    detail?: string | ApiValidationError[] | Record<string, string | string[] | number | boolean> | { error_code?: string; message?: string };
}

export interface ParsedApiError {
    message: string;
    fieldErrors: Record<string, string>;
    status?: number;
    errorCode?: string;
}
