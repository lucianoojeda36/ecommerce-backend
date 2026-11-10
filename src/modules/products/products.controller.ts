import { Request, Response, NextFunction } from 'express';
import { ProductsService } from './products.service';
import { CategoriesService } from './categories.service';
import { uploadImage, deleteImage } from '../../core/utils/storage';

const productsService = new ProductsService();
const categoriesService = new CategoriesService();

export class ProductsController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, category, search } = req.query;
      const result = await productsService.findAll({
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
        category: category as string,
        search: search as string,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async findBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.findBySlug(req.params.slug);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.findById(req.params.id);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.create(req.body);
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.update(req.params.id, req.body);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await productsService.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async uploadImages(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No se enviaron imágenes' });
      }

      const urls: string[] = [];
      for (const file of files) {
        const url = await uploadImage(file);
        urls.push(url);
      }

      const product = await productsService.addImages(req.params.id, urls);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  async removeImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { imageUrl } = req.body;
      const product = await productsService.removeImage(req.params.id, imageUrl);
      await deleteImage(imageUrl).catch(() => {});
      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  async uploadCategoryImage(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file as Express.Multer.File;
      if (!file) {
        return res.status(400).json({ error: 'No se envió la imagen' });
      }
      const url = await uploadImage(file);
      const category = await categoriesService.update(req.params.id, { image_url: url });
      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  // Categories
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await categoriesService.findAll();
      res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoriesService.create(req.body);
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoriesService.update(req.params.id, req.body);
      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      await categoriesService.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
