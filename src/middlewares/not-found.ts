import { Request, Response, NextFunction } from "express";

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`) as Error & { statusCode: number; isOperational: boolean };
  error.statusCode = 404;
  error.isOperational = true;
  next(error);
};