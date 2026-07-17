import type { Response } from 'express';

export function sendSuccess<TData, TMeta = Record<string, never>>(
  res: Response,
  data: TData,
  meta = {} as TMeta,
  status = 200
): void {
  res.status(status).json({
    success: true,
    data,
    meta,
    requestId: res.req.requestId
  });
}
