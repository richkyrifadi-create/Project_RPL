export interface ErrorResponse {
  Message: string;
  Errors?: Record<string, string[]>;
}
