-- CreateTable
CREATE TABLE `Unit` (
    `Id` INTEGER NOT NULL AUTO_INCREMENT,
    `Code` VARCHAR(20) NOT NULL,
    `Name` VARCHAR(120) NOT NULL,
    `Email` VARCHAR(191) NOT NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Unit_Code_key`(`Code`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `Id` INTEGER NOT NULL AUTO_INCREMENT,
    `Name` VARCHAR(120) NOT NULL,
    `Email` VARCHAR(191) NOT NULL,
    `PasswordHash` VARCHAR(100) NOT NULL,
    `Role` ENUM('STUDENT', 'STAFF', 'ADMIN') NOT NULL,
    `StudentNumber` VARCHAR(30) NULL,
    `StudyProgram` VARCHAR(120) NULL,
    `UnitId` INTEGER NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `LastLoginAt` DATETIME(3) NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_Email_key`(`Email`),
    UNIQUE INDEX `User_StudentNumber_key`(`StudentNumber`),
    INDEX `User_Role_idx`(`Role`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `Id` INTEGER NOT NULL AUTO_INCREMENT,
    `UnitId` INTEGER NOT NULL,
    `Name` VARCHAR(120) NOT NULL,
    `Description` VARCHAR(500) NOT NULL DEFAULT '',
    `SlaHours` INTEGER NOT NULL,
    `IsConfidential` BOOLEAN NOT NULL DEFAULT false,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ticket` (
    `Id` INTEGER NOT NULL AUTO_INCREMENT,
    `TicketNumber` VARCHAR(20) NOT NULL,
    `ReporterId` INTEGER NOT NULL,
    `CategoryId` INTEGER NOT NULL,
    `UnitId` INTEGER NOT NULL,
    `AssigneeId` INTEGER NULL,
    `Title` VARCHAR(200) NOT NULL,
    `Description` TEXT NOT NULL,
    `Priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `Status` ENUM('OPEN', 'IN_PROGRESS', 'WAITING_REPORTER', 'RESOLVED', 'CLOSED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
    `IsAnonymous` BOOLEAN NOT NULL DEFAULT false,
    `DueAt` DATETIME(3) NOT NULL,
    `FirstResponseAt` DATETIME(3) NULL,
    `ResolvedAt` DATETIME(3) NULL,
    `ClosedAt` DATETIME(3) NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Ticket_TicketNumber_key`(`TicketNumber`),
    INDEX `Ticket_UnitId_Status_idx`(`UnitId`, `Status`),
    INDEX `Ticket_ReporterId_idx`(`ReporterId`),
    INDEX `Ticket_AssigneeId_idx`(`AssigneeId`),
    INDEX `Ticket_DueAt_idx`(`DueAt`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketSequence` (
    `Year` INTEGER NOT NULL,
    `LastNumber` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`Year`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketComment` (
    `Id` INTEGER NOT NULL AUTO_INCREMENT,
    `TicketId` INTEGER NOT NULL,
    `AuthorId` INTEGER NOT NULL,
    `Body` TEXT NOT NULL,
    `IsInternal` BOOLEAN NOT NULL DEFAULT false,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TicketComment_TicketId_idx`(`TicketId`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketAttachment` (
    `Id` INTEGER NOT NULL AUTO_INCREMENT,
    `TicketId` INTEGER NOT NULL,
    `CommentId` INTEGER NULL,
    `UploadedById` INTEGER NOT NULL,
    `FileName` VARCHAR(255) NOT NULL,
    `StoredPath` VARCHAR(500) NOT NULL,
    `MimeType` VARCHAR(100) NOT NULL,
    `SizeBytes` INTEGER NOT NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TicketAttachment_TicketId_idx`(`TicketId`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketStatusHistory` (
    `Id` INTEGER NOT NULL AUTO_INCREMENT,
    `TicketId` INTEGER NOT NULL,
    `FromStatus` ENUM('OPEN', 'IN_PROGRESS', 'WAITING_REPORTER', 'RESOLVED', 'CLOSED', 'REJECTED') NULL,
    `ToStatus` ENUM('OPEN', 'IN_PROGRESS', 'WAITING_REPORTER', 'RESOLVED', 'CLOSED', 'REJECTED') NOT NULL,
    `ChangedById` INTEGER NULL,
    `Note` VARCHAR(1000) NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TicketStatusHistory_TicketId_idx`(`TicketId`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketFeedback` (
    `Id` INTEGER NOT NULL AUTO_INCREMENT,
    `TicketId` INTEGER NOT NULL,
    `Rating` TINYINT NOT NULL,
    `Comment` VARCHAR(1000) NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TicketFeedback_TicketId_key`(`TicketId`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_UnitId_fkey` FOREIGN KEY (`UnitId`) REFERENCES `Unit`(`Id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_UnitId_fkey` FOREIGN KEY (`UnitId`) REFERENCES `Unit`(`Id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_ReporterId_fkey` FOREIGN KEY (`ReporterId`) REFERENCES `User`(`Id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_AssigneeId_fkey` FOREIGN KEY (`AssigneeId`) REFERENCES `User`(`Id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_CategoryId_fkey` FOREIGN KEY (`CategoryId`) REFERENCES `Category`(`Id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_UnitId_fkey` FOREIGN KEY (`UnitId`) REFERENCES `Unit`(`Id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketComment` ADD CONSTRAINT `TicketComment_TicketId_fkey` FOREIGN KEY (`TicketId`) REFERENCES `Ticket`(`Id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketComment` ADD CONSTRAINT `TicketComment_AuthorId_fkey` FOREIGN KEY (`AuthorId`) REFERENCES `User`(`Id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketAttachment` ADD CONSTRAINT `TicketAttachment_TicketId_fkey` FOREIGN KEY (`TicketId`) REFERENCES `Ticket`(`Id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketAttachment` ADD CONSTRAINT `TicketAttachment_CommentId_fkey` FOREIGN KEY (`CommentId`) REFERENCES `TicketComment`(`Id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketAttachment` ADD CONSTRAINT `TicketAttachment_UploadedById_fkey` FOREIGN KEY (`UploadedById`) REFERENCES `User`(`Id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketStatusHistory` ADD CONSTRAINT `TicketStatusHistory_TicketId_fkey` FOREIGN KEY (`TicketId`) REFERENCES `Ticket`(`Id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketStatusHistory` ADD CONSTRAINT `TicketStatusHistory_ChangedById_fkey` FOREIGN KEY (`ChangedById`) REFERENCES `User`(`Id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketFeedback` ADD CONSTRAINT `TicketFeedback_TicketId_fkey` FOREIGN KEY (`TicketId`) REFERENCES `Ticket`(`Id`) ON DELETE RESTRICT ON UPDATE CASCADE;
