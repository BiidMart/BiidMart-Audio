import { Request, Response, NextFunction } from "express";
import { paymentService } from "../services/payment.service";

export const create = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { client_id, phone, amount, currency, method, notes } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ error: { message: "amount is required and must be positive" } });
      return;
    }

    const payment = await paymentService.create({
      client_id,
      phone,
      amount,
      currency,
      method,
      notes,
    });

    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
};

export const findAll = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await paymentService.findAll();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const findByClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payments = await paymentService.findByClient(req.params.clientId as string);
    res.json(payments);
  } catch (error) {
    next(error);
  }
};