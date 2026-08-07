import { Request, Response, NextFunction } from "express";
import { clientService } from "../services/client.service";

export const findAll = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clients = await clientService.findAll();
    res.json(clients);
  } catch (error) {
    next(error);
  }
};

export const findById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const client = await clientService.findById(req.params.id as string);
    if (!client) {
      res.status(404).json({ message: "Client not found" });
      return;
    }
    res.json(client);
  } catch (error) {
    next(error);
  }
};