import { Request, Response, NextFunction } from "express";
import { HealthResponse, RootResponse } from "../types/health.interface";

export const getRoot = (
  _req: Request,
  res: Response<RootResponse>,
  _next: NextFunction
): void => {
  res.json({
    message: "BiidMart Audio API",
  });
};

export const getHealth = (
  _req: Request,
  res: Response<HealthResponse>,
  _next: NextFunction
): void => {
  res.json({
    status: "ok",
  });
};