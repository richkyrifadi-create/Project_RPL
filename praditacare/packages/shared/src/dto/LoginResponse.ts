import type { User } from "../models/User.js";

export interface LoginResponse {
  AccessToken: string;
  User: User;
}
