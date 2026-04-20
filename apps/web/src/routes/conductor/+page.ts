import { fetchApi } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const usuarios = await fetchApi<any[]>('/usuarios');
		const conductores = usuarios.filter((u) => u.role === 'driver');

		// Fetch all routes for now to filter on client side based on selected driver
		// Or if we select the first driver by default:
		let defaultDriver = conductores[0];
		let rutas = [];

		if (defaultDriver) {
			rutas = await fetchApi<any[]>(`/rutas/conductor/${defaultDriver.id}`);
		}

		return {
			conductores,
			defaultDriver,
			rutas
		};
	} catch (e) {
		console.error(e);
		return {
			conductores: [],
			defaultDriver: null,
			rutas: []
		};
	}
};
