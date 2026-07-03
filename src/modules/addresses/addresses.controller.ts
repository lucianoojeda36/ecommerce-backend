import { Request, Response, NextFunction } from 'express';
import { AddressesService } from './addresses.service';

const addressesService = new AddressesService();

export class AddressesController {
  async findByUser(req: Request, res: Response, next: NextFunction) {
    try {
      const addresses = await addressesService.findByUser(req.user!.userId);
      res.json(addresses);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const address = await addressesService.create(req.user!.userId, req.body);
      res.status(201).json(address);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const address = await addressesService.update(req.params.id, req.user!.userId, req.body);
      res.json(address);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await addressesService.delete(req.params.id, req.user!.userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
