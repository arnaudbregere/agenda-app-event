import type { Request, Response } from "express";
import { CATEGORIES } from "../utils/categories.js";
import { createTypedRouter } from "./typedRouter.js";

const api = createTypedRouter();

api.get("/", (req: Request<{}, unknown, unknown>, res: Response<unknown>): void => {
  res.json(CATEGORIES);
});

export default api.router;
