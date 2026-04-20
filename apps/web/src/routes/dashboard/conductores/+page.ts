import { fetchApi } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const usuarios = await fetchApi<any[]>('/usuarios');
		// Filtrar solo conductores, o mostrar todos si se quiere
		const conductores = usuarios.filter((u) => u.role === 'driver');
		return {
			conductores,
			usuarios
		};
	} catch (e) {
		console.error(e);
		return {
			conductores: [],
			usuarios: []
		};
	}
};
