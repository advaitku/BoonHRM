-- Human-readable sequential reference (BOON-014) + explicit public publish state,
-- plus a one-time conversion of plain-text descriptions to minimal HTML.
--
-- refNumber is a real MySQL AUTO_INCREMENT on a non-PK column, which MySQL permits
-- for exactly one column provided it is indexed (the UNIQUE key created below).

-- 1. Add both columns nullable so existing rows survive.
ALTER TABLE `JobOpening`
  ADD COLUMN `refNumber` INTEGER NULL,
  ADD COLUMN `publishedAt` DATETIME(3) NULL;

-- 2. Backfill refNumber in creation order: 1, 2, 3, … The derived table is
--    materialized, so this self-referencing UPDATE is legal in MySQL/MariaDB.
--    (Needs MariaDB >= 10.2 / MySQL >= 8 for ROW_NUMBER.)
UPDATE `JobOpening` AS j
JOIN (
  SELECT `id`, ROW_NUMBER() OVER (ORDER BY `createdAt` ASC, `id` ASC) AS rn
  FROM `JobOpening`
) AS t ON t.`id` = j.`id`
SET j.`refNumber` = t.rn;

-- 3. Index BEFORE converting to AUTO_INCREMENT — MySQL rejects an auto column
--    that is not already a key. This must stay a separate statement.
CREATE UNIQUE INDEX `JobOpening_refNumber_key` ON `JobOpening`(`refNumber`);

-- 4. Promote to AUTO_INCREMENT. MySQL sets the next value to MAX(refNumber)+1
--    automatically (and to 1 on an empty table).
ALTER TABLE `JobOpening`
  MODIFY COLUMN `refNumber` INTEGER NOT NULL AUTO_INCREMENT;

-- 5. Plain-text descriptions -> minimal HTML, so the renderer only ever sees HTML.
--    Escape & first (or the later entities get double-escaped), then < and >, then
--    newlines to <br />. Guarded by NOT LIKE '<%' so re-running is a no-op.
UPDATE `JobOpening`
SET `description` = CONCAT(
      '<p>',
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(`description`, '&', '&amp;'),
            '<', '&lt;'),
          '>', '&gt;'),
        '\r', ''),
      '\n', '<br />'),
      '</p>')
WHERE `description` IS NOT NULL
  AND TRIM(`description`) <> ''
  AND `description` NOT LIKE '<%';
