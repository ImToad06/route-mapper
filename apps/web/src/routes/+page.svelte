<script lang="ts">
	import type { ApiMessage } from '@packages/types';
	import { onMount } from 'svelte';

	let data = $state<ApiMessage | null>(null);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			// In production, this might be behind a proxy or at a specific URL
			const res = await fetch('http://localhost:3000/');
			if (!res.ok) throw new Error('Error al conectar con la API');
			data = await res.json();
		} catch (e) {
			error = (e as Error).message;
		}
	});
</script>

<main class="container mx-auto p-8 font-sans">
	<h1 class="mb-4 text-4xl font-bold">Bienvenido a Route Mapper</h1>
	<p class="mb-6 text-lg">
		Esta es una aplicación full-stack construida con Bun, SvelteKit y ElysiaJS.
	</p>

	<div class="rounded-lg bg-gray-100 p-6 shadow-md">
		<h2 class="mb-2 text-2xl font-semibold">Estado de la API:</h2>
		{#if error}
			<p class="font-medium text-red-500">Error: {error}</p>
		{:else if data}
			<p class="text-xl font-medium text-green-600 italic">"{data.message}"</p>
		{:else}
			<p class="animate-pulse text-gray-500">Cargando mensaje de la API...</p>
		{/if}
	</div>

	<div class="mt-8">
		<h2 class="mb-2 text-2xl font-semibold">Características:</h2>
		<ul class="list-inside list-disc space-y-2">
			<li><strong>Frontend:</strong> SvelteKit (Svelte 5)</li>
			<li><strong>Backend:</strong> ElysiaJS</li>
			<li><strong>Base de Datos:</strong> PostgreSQL + Drizzle ORM</li>
			<li><strong>Runtime:</strong> Bun</li>
		</ul>
	</div>
</main>
