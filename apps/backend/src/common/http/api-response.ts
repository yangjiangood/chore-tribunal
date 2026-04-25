export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export function successResponse<T>(
  data: T,
  meta?: Record<string, unknown>,
): ApiSuccessResponse<T> {
  if (!meta) {
    return {
      success: true,
      data,
    };
  }

  return {
    success: true,
    data,
    meta,
  };
}
