import type { UserRole } from "../enums/UserRole.js";

export interface User {
  Id: number;
  Name: string;
  Email: string;
  Role: UserRole;
  StudentNumber: string | null;
  StudyProgram: string | null;
  UnitId: number | null;
  UnitName: string | null;
  IsActive: boolean;
  LastLoginAt: string | null;
  CreatedAt: string;
}
