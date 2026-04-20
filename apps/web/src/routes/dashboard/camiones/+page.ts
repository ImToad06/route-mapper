import { fetchApi } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	// We can pass the fetch function to our api helper or just use the local one
	// But our api helper uses the global fetch. Let's just use it directly for simplicity.
	// Since we are in the load function, we could pass fetch, but fetchApi does not take it yet.
	// Let's just use fetchApi as is. In SSR it might need absolute URL, which we have if PUBLIC_API_URL is set.

	try {
		const camiones = await fetchApi<any[]>('/camiones');
		return {
			camiones
		};
	} catch (e) {
		console.error(e);
		return {
			camiones: []
		};
	}
};
