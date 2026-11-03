export interface TicketFeedback {
  Id: number;
  TicketId: number;
  Rating: number;
  Comment: string | null;
  CreatedAt: string;
}
