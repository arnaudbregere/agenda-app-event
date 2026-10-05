import type { Request, RequestHandler, Response } from "express";
import type { ParseResult } from "../utils/validators.js";
import type { ValidationErrorBody } from "../types.js";

// Valide le corps HTTP avant le handler. Le handler reçoit un `req.body` déjà
// typé `B` : seul ce middleware touche à la donnée non fiable.
// Réponse 400 : ValidationErrorBody ; réponses du handler : R.
export const withBody =
  <P, B, R>(
    parse: (body: unknown) => ParseResult<B>,
    handler: (req: Request<P, R, B>, res: Response<R>) => Promise<void>
  ): RequestHandler<P, R | ValidationErrorBody, unknown> =>
  (req, res) => {
    const result = parse(req.body);
    if (!result.ok) {
      res.status(400).json({ errors: result.errors });
      return;
    }
    const typedReq: Request<P, R, B> = Object.assign(req, { body: result.value });
    return handler(typedReq, res);
  };
