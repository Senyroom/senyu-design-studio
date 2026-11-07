CREATE TABLE `PublicContentRevision` (
  `id` VARCHAR(30) NOT NULL,
  `revision` INTEGER NOT NULL DEFAULT 1,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
INSERT INTO `PublicContentRevision` (`id`, `revision`, `updatedAt`) VALUES ('public', 1, CURRENT_TIMESTAMP(3));
