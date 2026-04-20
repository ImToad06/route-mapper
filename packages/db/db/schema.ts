import {
	pgTable,
	text,
	timestamp,
	integer,
	boolean,
	doublePrecision,
	date,
	pgEnum
} from 'drizzle-orm/pg-core';

// Users and Better Auth Schema
export const users = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('emailVerified').notNull(),
	image: text('image'),
	createdAt: timestamp('createdAt').notNull(),
	updatedAt: timestamp('updatedAt').notNull(),
	role: text('role'),
	banned: boolean('banned'),
	banReason: text('banReason'),
	banExpires: timestamp('banExpires')
});

export const sessions = pgTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expiresAt').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('createdAt').notNull(),
	updatedAt: timestamp('updatedAt').notNull(),
	ipAddress: text('ipAddress'),
	userAgent: text('userAgent'),
	userId: text('userId')
		.notNull()
		.references(() => users.id)
});

export const accounts = pgTable('account', {
	id: text('id').primaryKey(),
	accountId: text('accountId').notNull(),
	providerId: text('providerId').notNull(),
	userId: text('userId')
		.notNull()
		.references(() => users.id),
	accessToken: text('accessToken'),
	refreshToken: text('refreshToken'),
	idToken: text('idToken'),
	accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
	refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('createdAt').notNull(),
	updatedAt: timestamp('updatedAt').notNull()
});

export const verifications = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expiresAt').notNull(),
	createdAt: timestamp('createdAt'),
	updatedAt: timestamp('updatedAt')
});

// Route Mapper Domain Schema
export const truckStatusEnum = pgEnum('truck_status', ['active', 'maintenance', 'inactive']);
export const routeStatusEnum = pgEnum('route_status', [
	'draft',
	'planned',
	'in_progress',
	'completed'
]);
export const stopStatusEnum = pgEnum('stop_status', ['pending', 'completed', 'skipped']);

export const trucks = pgTable('truck', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	licensePlate: text('license_plate').notNull().unique(),
	capacity: integer('capacity').notNull(), // volume or weight capacity
	status: truckStatusEnum('status').notNull().default('active'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const stores = pgTable('store', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	address: text('address').notNull(),
	latitude: doublePrecision('latitude').notNull(),
	longitude: doublePrecision('longitude').notNull(),
	contactInfo: text('contact_info'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const routes = pgTable('route', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	truckId: text('truck_id')
		.references(() => trucks.id)
		.notNull(),
	driverId: text('driver_id')
		.references(() => users.id)
		.notNull(),
	date: date('date').notNull(),
	status: routeStatusEnum('status').notNull().default('draft'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const routeStops = pgTable('route_stop', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	routeId: text('route_id')
		.references(() => routes.id)
		.notNull(),
	storeId: text('store_id')
		.references(() => stores.id)
		.notNull(),
	stopOrder: integer('stop_order').notNull(),
	status: stopStatusEnum('status').notNull().default('pending'),
	estimatedArrival: timestamp('estimated_arrival'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const orders = pgTable('order', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	routeStopId: text('route_stop_id')
		.references(() => routeStops.id)
		.notNull(),
	itemDescription: text('item_description').notNull(),
	quantity: integer('quantity').notNull(),
	status: text('status').notNull().default('pending'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});
