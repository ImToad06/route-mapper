import { fetchApi } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	try {
		const ruta = await fetchApi<any>(`/rutas/${params.id}/detalle`);
		return {
			ruta
		};
	} catch (e) {
		console.error(e);
		return {
			ruta: null
		};
	}
};
