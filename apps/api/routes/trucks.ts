import { Elysia, t } from 'elysia';
import { db, trucks } from '@packages/db';
import { eq } from 'drizzle-orm';

export const trucksRoutes = new Elysia({ prefix: '/camiones' })
	.get('/', async () => {
		return await db.select().from(trucks);
	})
	.post(
		'/',
		async ({ body }) => {
			return await db.insert(trucks).values(body).returning();
		},
		{
			body: t.Object({
				name: t.String(),
				licensePlate: t.String(),
				capacity: t.Number(),
				status: t.Optional(
					t.Union([t.Literal('active'), t.Literal('maintenance'), t.Literal('inactive')])
				)
			})
		}
	)
	.get('/:id', async ({ params: { id } }) => {
		const result = await db.select().from(trucks).where(eq(trucks.id, id));
		return result[0] || null;
	})
	.put(
		'/:id',
		async ({ params: { id }, body }) => {
			const result = await db.update(trucks).set(body).where(eq(trucks.id, id)).returning();
			return result[0] || null;
		},
		{
			body: t.Partial(
				t.Object({
					name: t.String(),
					licensePlate: t.String(),
					capacity: t.Number(),
					status: t.Union([t.Literal('active'), t.Literal('maintenance'), t.Literal('inactive')])
				})
			)
		}
	)
	.delete('/:id', async ({ params: { id } }) => {
		const result = await db.delete(trucks).where(eq(trucks.id, id)).returning();
		return result[0] || null;
	});
