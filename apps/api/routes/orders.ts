import { Elysia, t } from 'elysia';
import { db, orders } from '@packages/db';
import { eq } from 'drizzle-orm';

export const ordersRoutes = new Elysia({ prefix: '/pedidos' })
	.get('/', async () => {
		return await db.select().from(orders);
	})
	.post(
		'/',
		async ({ body }) => {
			return await db.insert(orders).values(body).returning();
		},
		{
			body: t.Object({
				routeStopId: t.String(),
				itemDescription: t.String(),
				quantity: t.Number(),
				status: t.Optional(t.String())
			})
		}
	)
	.get('/:id', async ({ params: { id } }) => {
		const result = await db.select().from(orders).where(eq(orders.id, id));
		return result[0] || null;
	})
	.put(
		'/:id',
		async ({ params: { id }, body }) => {
			const result = await db.update(orders).set(body).where(eq(orders.id, id)).returning();
			return result[0] || null;
		},
		{
			body: t.Partial(
				t.Object({
					routeStopId: t.String(),
					itemDescription: t.String(),
					quantity: t.Number(),
					status: t.String()
				})
			)
		}
	)
	.delete('/:id', async ({ params: { id } }) => {
		const result = await db.delete(orders).where(eq(orders.id, id)).returning();
		return result[0] || null;
	});
