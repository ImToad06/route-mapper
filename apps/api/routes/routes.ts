import { Elysia, t } from 'elysia';
import { db, routes } from '@packages/db';
import { eq } from 'drizzle-orm';

export const deliveryRoutes = new Elysia({ prefix: '/rutas' })
	.get('/', async () => {
		return await db.select().from(routes);
	})
	.post(
		'/',
		async ({ body }) => {
			// Note: Drizzle's date type expects a string mapping to YYYY-MM-DD
			return await db.insert(routes).values(body).returning();
		},
		{
			body: t.Object({
				truckId: t.String(),
				driverId: t.String(),
				date: t.String(),
				status: t.Optional(
					t.Union([
						t.Literal('draft'),
						t.Literal('planned'),
						t.Literal('in_progress'),
						t.Literal('completed')
					])
				)
			})
		}
	)
	.get('/:id', async ({ params: { id } }) => {
		const result = await db.select().from(routes).where(eq(routes.id, id));
		return result[0] || null;
	})
	.put(
		'/:id',
		async ({ params: { id }, body }) => {
			const result = await db.update(routes).set(body).where(eq(routes.id, id)).returning();
			return result[0] || null;
		},
		{
			body: t.Partial(
				t.Object({
					truckId: t.String(),
					driverId: t.String(),
					date: t.String(),
					status: t.Union([
						t.Literal('draft'),
						t.Literal('planned'),
						t.Literal('in_progress'),
						t.Literal('completed')
					])
				})
			)
		}
	)
	.delete('/:id', async ({ params: { id } }) => {
		const result = await db.delete(routes).where(eq(routes.id, id)).returning();
		return result[0] || null;
	});
