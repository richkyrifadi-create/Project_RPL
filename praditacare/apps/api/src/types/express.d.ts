import type { UserRole } from "@praditacare/shared";

export interface AuthUser {
  Id: number;
  Name: string;
  Role: UserRole;
  UnitId: number | null;
}

declare global {
  namespace Express {
    interface Request {
      AuthUser?: AuthUser;
      RequestId?: string;
    }
  }
}
