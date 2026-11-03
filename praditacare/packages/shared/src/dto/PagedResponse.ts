export interface PagedResponse<T> {
  Items: T[];
  Page: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
}
