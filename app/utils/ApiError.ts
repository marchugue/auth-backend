export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', details?: unknown): ApiError {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = 'Unauthorized', details?: unknown): ApiError {
    return new ApiError(401, message, details);
  }
  static forbidden(message = 'Forbidden', details?: unknown): ApiError {
    return new ApiError(403, message, details);
  }
  static notFound(message = 'Not Found', details?: unknown): ApiError {
    return new ApiError(404, message, details);
  }
  static conflict(message = 'Conflict', details?: unknown): ApiError {
    return new ApiError(409, message, details);
  }
  static internal(message = 'Internal Server Error', details?: unknown): ApiError {
    return new ApiError(500, message, details, false);
  }
}
