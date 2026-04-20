import { Elysia, t } from 'elysia';
import { db, stores } from '@packages/db';
import { eq } from 'drizzle-orm';

export const storesRoutes = new Elysia({ prefix: '/tiendas' })
	.get('/', async () => {
		return await db.select().from(stores);
	})
	.post(
		'/',
		async ({ body }) => {
			return await db.insert(stores).values(body).returning();
		},
		{
			body: t.Object({
				name: t.String(),
				address: t.String(),
				latitude: t.Number(),
				longitude: t.Number(),
				contactInfo: t.Optional(t.String())
			})
		}
	)
	.get('/:id', async ({ params: { id } }) => {
		const result = await db.select().from(stores).where(eq(stores.id, id));
		return result[0] || null;
	})
	.put(
		'/:id',
		async ({ params: { id }, body }) => {
			const result = await db.update(stores).set(body).where(eq(stores.id, id)).returning();
			return result[0] || null;
		},
		{
			body: t.Partial(
				t.Object({
					name: t.String(),
					address: t.String(),
					latitude: t.Number(),
					longitude: t.Number(),
					contactInfo: t.String()
				})
			)
		}
	)
	.delete('/:id', async ({ params: { id } }) => {
		const result = await db.delete(stores).where(eq(stores.id, id)).returning();
		return result[0] || null;
	});
