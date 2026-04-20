import { fetchApi } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const [rutas, camiones, tiendas, usuarios] = await Promise.all([
			fetchApi<any[]>('/rutas'),
			fetchApi<any[]>('/camiones'),
			fetchApi<any[]>('/tiendas'),
			fetchApi<any[]>('/usuarios')
		]);

		const conductores = usuarios.filter((u) => u.role === 'driver');

		return {
			rutas,
			camiones,
			tiendas,
			conductores
		};
	} catch (e) {
		console.error(e);
		return {
			rutas: [],
			camiones: [],
			tiendas: [],
			conductores: []
		};
	}
};
