CREATE TABLE `game_rooms` (
 `code` text PRIMARY KEY NOT NULL,
 `version` integer DEFAULT 1 NOT NULL,
 `state` text NOT NULL,
 `expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `game_rooms_expires_idx` ON `game_rooms` (`expires`);
