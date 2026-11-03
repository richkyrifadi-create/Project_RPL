export interface Category {
  Id: number;
  UnitId: number;
  UnitName: string;
  Name: string;
  Description: string;
  SlaHours: number;
  IsConfidential: boolean;
  RequiresLocation: boolean;
  IsActive: boolean;
  CreatedAt: string;
}
