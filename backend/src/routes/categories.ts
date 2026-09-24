import { Router } from "express";
import { CATEGORIES } from "../utils/categories.js";

const router = Router();

router.get("/", (req, res) => {
  res.json(CATEGORIES);
});

export default router;
