import { env } from '$env/dynamic/public';

const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
	const response = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options?.headers
		}
	});

	if (!response.ok) {
		throw new Error(`Error fetching ${path}: ${response.statusText}`);
	}

	return response.json();
}
