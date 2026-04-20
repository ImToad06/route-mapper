import { fetchApi } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const tiendas = await fetchApi<any[]>('/tiendas');
		return {
			tiendas
		};
	} catch (e) {
		console.error(e);
		return {
			tiendas: []
		};
	}
};
