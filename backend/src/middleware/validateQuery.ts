import type { Request, RequestHandler, Response } from "express";
import type { ParseResult } from "../utils/validators.js";

// Valide la query string avant le handler. Le handler reçoit un `req.query`
// déjà typé `Q` : seul ce middleware touche à la donnée non fiable.
export const withQuery =
  <P, Q>(
    parse: (query: unknown) => ParseResult<Q>,
    handler: (req: Request<P, unknown, unknown, Q>, res: Response<unknown>) => Promise<void>
  ): RequestHandler<P, unknown, unknown> =>
  (req, res) => {
    const result = parse(req.query);
    if (!result.ok) {
      res.status(400).json({ errors: result.errors });
      return;
    }
    const typedReq: Request<P, unknown, unknown, Q> = Object.assign(req, { query: result.value });
    return handler(typedReq, res);
  };
