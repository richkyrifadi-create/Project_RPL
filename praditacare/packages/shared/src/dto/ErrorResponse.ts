export interface ErrorResponse {
  Message: string;
  Errors?: Record<string, string[]>;
  /** Id request untuk dicocokkan dengan log server (hanya pada error 500). */
  RequestId?: string;
}
