// Schema corresponding to the initial, schema-only migration in drizzle/.
import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const gameRooms=sqliteTable('game_rooms',{code:text('code').primaryKey(),version:integer('version').notNull().default(1),state:text('state').notNull(),expires:integer('expires').notNull()},t=>[index('game_rooms_expires_idx').on(t.expires)]);
