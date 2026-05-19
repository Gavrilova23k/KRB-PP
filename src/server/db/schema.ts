import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Таблица пользователей
export const users = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password'),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('createdAt').notNull(),
  updatedAt: integer('updatedAt').notNull(),
});

// Таблица сессий
export const sessions = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expiresAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: integer('createdAt').notNull(),
  updatedAt: integer('updatedAt').notNull(),
});

// Таблица для OAuth аккаунтов (требуется better-auth)
export const accounts = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt'),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt'),
  scope: text('scope'),
  idToken: text('idToken'),
  password: text('password'),
  createdAt: integer('createdAt').notNull(),
  updatedAt: integer('updatedAt').notNull(),
});

// Города
export const cities = sqliteTable('cities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
  image: text('image').notNull(),
  population: integer('population').notNull(),
  climate: text('climate').notNull(),
  latitude: text('latitude').notNull(),
  longitude: text('longitude').notNull(),
});

// Избранное
export const favorites = sqliteTable('favorites', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  cityId: integer('cityId').notNull().references(() => cities.id, { onDelete: 'cascade' }),
  createdAt: integer('createdAt').notNull(),
}, (table) => ({
  userCityUnique: uniqueIndex('user_city_unique').on(table.userId, table.cityId),
}));

// Отзывы
export const feedbacks = sqliteTable('feedbacks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  cityId: integer('cityId').notNull().references(() => cities.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  rating: integer('rating').default(5),
  createdAt: integer('createdAt').notNull(),
  updatedAt: integer('updatedAt').notNull(),
});

// ========== НОВЫЕ ТАБЛИЦЫ ДЛЯ ДОСТИЖЕНИЙ ==========

// Таблица достижений пользователя
export const userAchievements = sqliteTable('user_achievements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  achievementId: text('achievementId').notNull(),
  achievedAt: integer('achievedAt').notNull(),
}, (table) => ({
  userAchievementUnique: uniqueIndex('user_achievement_unique').on(table.userId, table.achievementId),
}));

// Таблица статистики пользователя
export const userStats = sqliteTable('user_stats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  citiesViewed: integer('citiesViewed').notNull().default(0),
  feedbacksCount: integer('feedbacksCount').notNull().default(0),
  favoritesCount: integer('favoritesCount').notNull().default(0),
  updatedAt: integer('updatedAt').notNull(),
});

export type User = typeof users.$inferSelect;
export type City = typeof cities.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type UserStat = typeof userStats.$inferSelect;