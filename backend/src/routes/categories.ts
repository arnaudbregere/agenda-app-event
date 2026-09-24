import { Router, type Request, type Response } from "express";
import { CATEGORIES } from "../utils/categories.js";

const router = Router();

router.get("/", (req: Request, res: Response): void => {
  res.json(CATEGORIES);
});

export default router;
