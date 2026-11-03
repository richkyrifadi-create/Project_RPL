export const UploadLimits = {
  MaxFilesPerUpload: 5,
  DefaultMaxFileMb: 5,
  AllowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
  AllowedExtensions: [".jpg", ".jpeg", ".png", ".pdf"]
} as const;
