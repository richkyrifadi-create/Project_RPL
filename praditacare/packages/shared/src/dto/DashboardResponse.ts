export interface DashboardSummary {
  TotalTickets: number;
  OpenTickets: number;
  InProgressTickets: number;
  ResolvedTickets: number;
  OverdueTickets: number;
  AverageFirstResponseHours: number | null;
  AverageResolutionHours: number | null;
  SlaComplianceRate: number | null;
  AverageRating: number | null;
}

export interface DashboardUnitRow {
  UnitId: number;
  UnitName: string;
  OpenTickets: number;
  OverdueTickets: number;
  SlaComplianceRate: number | null;
  AverageRating: number | null;
}

export interface DashboardCategoryRow {
  CategoryId: number;
  CategoryName: string;
  TicketCount: number;
}

export interface DashboardLocationRow {
  Location: string;
  TicketCount: number;
  ActiveCount: number;
  Categories: string[];
}

export interface DashboardResponse {
  From: string;
  To: string;
  Summary: DashboardSummary;
  Units: DashboardUnitRow[];
  Categories: DashboardCategoryRow[];
  Locations: DashboardLocationRow[];
}

export interface ActionCountResponse {
  Count: number;
}
