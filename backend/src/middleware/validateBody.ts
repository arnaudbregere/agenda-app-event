import type { Request, RequestHandler, Response } from "express";
import type { ParseResult } from "../utils/validators.js";

// Valide le corps HTTP avant le handler. Le handler reçoit un `req.body` déjà
// typé `B` : seul ce middleware touche à la donnée non fiable.
export const withBody =
  <P, B>(
    parse: (body: unknown) => ParseResult<B>,
    handler: (req: Request<P, unknown, B>, res: Response<unknown>) => Promise<void>
  ): RequestHandler<P, unknown, unknown> =>
  (req, res) => {
    const result = parse(req.body);
    if (!result.ok) {
      res.status(400).json({ errors: result.errors });
      return;
    }
    const typedReq: Request<P, unknown, B> = Object.assign(req, { body: result.value });
    return handler(typedReq, res);
  };
