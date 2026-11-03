export const UserRoleValues = ["STUDENT", "STAFF", "ADMIN"] as const;
export type UserRole = (typeof UserRoleValues)[number];
