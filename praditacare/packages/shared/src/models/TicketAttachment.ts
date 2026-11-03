export interface TicketAttachment {
  Id: number;
  TicketId: number;
  CommentId: number | null;
  UploadedById: number | null;
  FileName: string;
  MimeType: string;
  SizeBytes: number;
  CreatedAt: string;
}
