import { Elysia } from 'elysia';
import { db, users } from '@packages/db';
import { trucksRoutes } from './routes/trucks';
import { storesRoutes } from './routes/stores';
import { deliveryRoutes } from './routes/routes';
import { stopsRoutes } from './routes/stops';
import { ordersRoutes } from './routes/orders';
import type { ApiMessage } from '@packages/types';

const app = new Elysia()
	.get('/', () => {
		const response: ApiMessage = { message: '¡Hola desde Elysia!' };
		return response;
	})
	.get('/usuarios', async () => {
		return await db.select().from(users);
	})
	.use(trucksRoutes)
	.use(storesRoutes)
	.use(deliveryRoutes)
	.use(stopsRoutes)
	.use(ordersRoutes)
	.listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
