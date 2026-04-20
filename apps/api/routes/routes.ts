import { Elysia, t } from 'elysia';
import { db, routes, routeStops, stores } from '@packages/db';
import { eq, inArray } from 'drizzle-orm';

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
	.post('/:id/optimizar', async ({ params: { id } }) => {
		// 1. Obtener la ruta
		const routeResult = await db.select().from(routes).where(eq(routes.id, id));
		const route = routeResult[0];
		if (!route) throw new Error('Ruta no encontrada');

		// 2. Obtener todas las paradas (stops) de esta ruta
		const stops = await db.select().from(routeStops).where(eq(routeStops.routeId, id));
		if (stops.length < 2) {
			return { message: 'No hay suficientes paradas para optimizar', stops };
		}

		// 3. Obtener la información de las tiendas para obtener coordenadas
		const storeIds = stops.map((s) => s.storeId);
		const storesInfo = await db.select().from(stores).where(inArray(stores.id, storeIds));

		// Crear un mapa para fácil acceso a las coordenadas
		const storeMap = new Map();
		for (const s of storesInfo) {
			storeMap.set(s.id, s);
		}

		// 4. Preparar la llamada a la API OSRM Trip
		// OSRM format: {longitude},{latitude};{longitude},{latitude}...
		const coordinates = stops
			.map((stop) => {
				const store = storeMap.get(stop.storeId);
				return `${store.longitude},${store.latitude}`;
			})
			.join(';');

		// Construir URL. roundtrip=false si no queremos que vuelva al inicio, pero por defecto OSRM hace roundtrip
		const osrmUrl = `http://router.project-osrm.org/trip/v1/driving/${coordinates}?roundtrip=true&source=first`;

		const response = await fetch(osrmUrl);
		if (!response.ok) {
			throw new Error('Error al conectar con el servicio de optimización');
		}

		const data = await response.json();

		if (data.code !== 'Ok' || !data.waypoints) {
			throw new Error('El servicio no pudo optimizar la ruta');
		}

		// 5. Actualizar el stopOrder según la respuesta de OSRM
		// data.waypoints tiene un array ordenado por el trip.
		// waypoint.waypoint_index es el índice original en la cadena de coordenadas
		// waypoint.trips_index es el orden en la ruta optimizada
		const waypoints = data.waypoints;
		// Ordenar los waypoints por el waypoint_index para alinear con nuestro array de stops
		waypoints.sort((a: any, b: any) => a.waypoint_index - b.waypoint_index);

		const updates = [];
		for (let i = 0; i < stops.length; i++) {
			const stop = stops[i];
			const waypoint = waypoints[i];

			// El trips_index es 0-based. Le sumamos 1 para el stopOrder.
			const newOrder = waypoint.trips_index + 1;

			const updatePromise = db
				.update(routeStops)
				.set({ stopOrder: newOrder })
				.where(eq(routeStops.id, stop.id));

			updates.push(updatePromise);
		}

		await Promise.all(updates);

		// Cambiar el estado de la ruta a "planned" si estaba en "draft"
		if (route.status === 'draft') {
			await db.update(routes).set({ status: 'planned' }).where(eq(routes.id, id));
		}

		return { message: 'Ruta optimizada correctamente' };
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
