import type { Request, Response } from "express";
import type { Category } from "../utils/categories.js";
import { CATEGORIES } from "../utils/categories.js";
import { createTypedRouter } from "./typedRouter.js";

const api = createTypedRouter();

api.get("/", (req: Request<{}, unknown, unknown>, res: Response<readonly Category[]>): void => {
  res.json(CATEGORIES);
});

export default api.router;
