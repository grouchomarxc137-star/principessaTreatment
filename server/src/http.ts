import type { Request } from "express";
import type { z } from "zod";
import type { Me, Role } from "../../shared/types.ts";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new HttpError(400, `${issue.path.join(".") || "body"}: ${issue.message}`);
  }
  return result.data;
}

// Set by the session middleware in auth.ts.
export function currentUser(req: Request): Me {
  const user = req.user;
  if (!user) throw new HttpError(401, "Sign in first.");
  return user;
}

export function requireRole(req: Request, role: Role): Me {
  const user = currentUser(req);
  if (user.role !== role) throw new HttpError(403, "That's not yours to do.");
  return user;
}

declare global {
  namespace Express {
    interface Request {
      user?: Me;
    }
  }
}
