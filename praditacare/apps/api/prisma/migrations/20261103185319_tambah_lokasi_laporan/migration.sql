-- AlterTable
ALTER TABLE `Category` ADD COLUMN `RequiresLocation` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Ticket` ADD COLUMN `Location` VARCHAR(150) NULL;

-- Data lama: kategori milik unit Sarana Prasarana (fasilitas fisik) langsung mewajibkan lokasi.
-- Kategori lain tetap opsional dan bisa diatur admin dari halaman Kategori.
UPDATE `Category` c JOIN `Unit` u ON u.`Id` = c.`UnitId` SET c.`RequiresLocation` = true WHERE u.`Code` = 'SARPRAS';
