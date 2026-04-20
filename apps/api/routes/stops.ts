import { Elysia, t } from 'elysia';
import { db, routeStops } from '@packages/db';
import { eq } from 'drizzle-orm';

export const stopsRoutes = new Elysia({ prefix: '/paradas' })
	.get('/', async () => {
		return await db.select().from(routeStops);
	})
	.post(
		'/',
		async ({ body }) => {
			const data = {
				...body,
				estimatedArrival: body.estimatedArrival ? new Date(body.estimatedArrival) : undefined
			};
			return await db.insert(routeStops).values(data).returning();
		},
		{
			body: t.Object({
				routeId: t.String(),
				storeId: t.String(),
				stopOrder: t.Number(),
				status: t.Optional(
					t.Union([t.Literal('pending'), t.Literal('completed'), t.Literal('skipped')])
				),
				estimatedArrival: t.Optional(t.String())
			})
		}
	)
	.get('/:id', async ({ params: { id } }) => {
		const result = await db.select().from(routeStops).where(eq(routeStops.id, id));
		return result[0] || null;
	})
	.put(
		'/:id',
		async ({ params: { id }, body }) => {
			const data = {
				...body,
				estimatedArrival: body.estimatedArrival ? new Date(body.estimatedArrival) : undefined
			};
			const result = await db.update(routeStops).set(data).where(eq(routeStops.id, id)).returning();
			return result[0] || null;
		},
		{
			body: t.Partial(
				t.Object({
					routeId: t.String(),
					storeId: t.String(),
					stopOrder: t.Number(),
					status: t.Union([t.Literal('pending'), t.Literal('completed'), t.Literal('skipped')]),
					estimatedArrival: t.String()
				})
			)
		}
	)
	.delete('/:id', async ({ params: { id } }) => {
		const result = await db.delete(routeStops).where(eq(routeStops.id, id)).returning();
		return result[0] || null;
	});
