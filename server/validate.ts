import { ZodSchema } from "zod";
import type { Request, Response, NextFunction } from "express";

export function validate(opts: { body?: ZodSchema<any>; query?: ZodSchema<any>; params?: ZodSchema<any> }) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-expect-error - attach parsed data
      req.valid = {
        body: opts.body ? opts.body.parse(req.body) : undefined,
        query: opts.query ? opts.query.parse(req.query) : undefined,
        params: opts.params ? opts.params.parse(req.params) : undefined,
      };
      next();
    } catch (err: any) {
      res.status(400).json({ error: "Invalid request", details: err.errors ?? String(err) });
    }
  };
}