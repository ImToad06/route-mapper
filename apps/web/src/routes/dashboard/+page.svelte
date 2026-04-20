<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchApi } from '$lib/api';

	let stats = $state({
		rutas: 0,
		camiones: 0,
		tiendas: 0,
		conductores: 0
	});

	let loading = $state(true);

	onMount(async () => {
		try {
			// In a real scenario we'd have a specific endpoint for stats
			const [rutas, camiones, tiendas, conductores] = await Promise.all([
				fetchApi<any[]>('/rutas'),
				fetchApi<any[]>('/camiones'),
				fetchApi<any[]>('/tiendas'),
				fetchApi<any[]>('/usuarios')
			]);

			stats = {
				rutas: rutas.length,
				camiones: camiones.length,
				tiendas: tiendas.length,
				conductores: conductores.filter((u) => u.role === 'driver').length
			};
		} catch (error) {
			console.error('Error loading stats', error);
		} finally {
			loading = false;
		}
	});
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-2xl font-bold text-gray-900">Panel Principal</h2>
		<p class="mt-1 text-sm text-gray-500">Resumen de la operación del día.</p>
	</div>

	{#if loading}
		<div class="flex justify-center p-12">
			<div
				class="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
			></div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
			<!-- Stats cards -->
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="p-5">
					<div class="flex items-center">
						<div class="flex-shrink-0 rounded-md bg-blue-100 p-3">
							<!-- Icon Map -->
							<svg
								class="h-6 w-6 text-blue-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
								/>
							</svg>
						</div>
						<div class="ml-5 w-0 flex-1">
							<dl>
								<dt class="truncate text-sm font-medium text-gray-500">Rutas Activas</dt>
								<dd>
									<div class="text-lg font-medium text-gray-900">{stats.rutas}</div>
								</dd>
							</dl>
						</div>
					</div>
				</div>
			</div>

			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="p-5">
					<div class="flex items-center">
						<div class="flex-shrink-0 rounded-md bg-green-100 p-3">
							<!-- Icon Truck -->
							<svg
								class="h-6 w-6 text-green-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
								/>
							</svg>
						</div>
						<div class="ml-5 w-0 flex-1">
							<dl>
								<dt class="truncate text-sm font-medium text-gray-500">Camiones</dt>
								<dd>
									<div class="text-lg font-medium text-gray-900">{stats.camiones}</div>
								</dd>
							</dl>
						</div>
					</div>
				</div>
			</div>

			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="p-5">
					<div class="flex items-center">
						<div class="flex-shrink-0 rounded-md bg-yellow-100 p-3">
							<!-- Icon Store -->
							<svg
								class="h-6 w-6 text-yellow-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
								/>
							</svg>
						</div>
						<div class="ml-5 w-0 flex-1">
							<dl>
								<dt class="truncate text-sm font-medium text-gray-500">Tiendas</dt>
								<dd>
									<div class="text-lg font-medium text-gray-900">{stats.tiendas}</div>
								</dd>
							</dl>
						</div>
					</div>
				</div>
			</div>

			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="p-5">
					<div class="flex items-center">
						<div class="flex-shrink-0 rounded-md bg-purple-100 p-3">
							<!-- Icon User -->
							<svg
								class="h-6 w-6 text-purple-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
								/>
							</svg>
						</div>
						<div class="ml-5 w-0 flex-1">
							<dl>
								<dt class="truncate text-sm font-medium text-gray-500">Conductores</dt>
								<dd>
									<div class="text-lg font-medium text-gray-900">{stats.conductores}</div>
								</dd>
							</dl>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
