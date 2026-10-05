import { type Request, type Response } from "express";
import { CATEGORIES } from "../utils/categories.js";
import { createTypedRouter } from "./typedRouter.js";

const api = createTypedRouter();

api.get("/", (req: Request, res: Response): void => {
  res.json(CATEGORIES);
});

export default api.router;
