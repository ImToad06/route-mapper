<script lang="ts">
	import { fetchApi } from '$lib/api';

	let { data } = $props();

	let selectedDriverId = $state('');
	let rutas = $state([]);
	let loading = $state(false);

	$effect(() => {
		if (data.defaultDriver && !selectedDriverId) {
			selectedDriverId = data.defaultDriver.id;
		}
		if (data.rutas && rutas.length === 0) {
			rutas = data.rutas;
		}
	});

	async function loadRoutes() {
		if (!selectedDriverId) return;
		loading = true;
		try {
			rutas = await fetchApi<any[]>(`/rutas/conductor/${selectedDriverId}`);
		} catch (error) {
			console.error('Error fetching routes:', error);
			rutas = [];
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
		<label for="driver-select" class="mb-1 block text-sm font-medium text-gray-700">
			Simular vista como (Conductor):
		</label>
		<select
			id="driver-select"
			bind:value={selectedDriverId}
			onchange={loadRoutes}
			class="mt-1 block w-full rounded-md border-gray-300 py-2 pr-10 pl-3 text-base focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
		>
			<option value="" disabled>Seleccione un conductor</option>
			{#each data.conductores as conductor}
				<option value={conductor.id}>{conductor.name}</option>
			{/each}
		</select>
	</div>

	<div>
		<h2 class="mb-4 text-xl font-bold text-gray-900">Mis Rutas Asignadas</h2>

		{#if loading}
			<div class="flex justify-center p-8">
				<div
					class="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
				></div>
			</div>
		{:else if rutas.length === 0}
			<div class="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
				<svg
					class="mx-auto h-12 w-12 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">No hay rutas</h3>
				<p class="mt-1 text-sm text-gray-500">No tienes rutas asignadas en este momento.</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each rutas as ruta}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors active:bg-gray-50"
						onclick={() => (window.location.href = `/conductor/rutas/${ruta.id}`)}
					>
						<div class="mb-2 flex items-start justify-between">
							<div class="flex items-center space-x-2">
								<svg
									class="h-5 w-5 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
								<span class="font-semibold text-gray-900">{ruta.date}</span>
							</div>
							<span
								class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
								{ruta.status === 'completed'
									? 'bg-green-100 text-green-800'
									: ruta.status === 'in_progress'
										? 'bg-blue-100 text-blue-800'
										: ruta.status === 'planned'
											? 'bg-yellow-100 text-yellow-800'
											: 'bg-gray-100 text-gray-800'}"
							>
								{ruta.status === 'completed'
									? 'Completada'
									: ruta.status === 'in_progress'
										? 'En Curso'
										: ruta.status === 'planned'
											? 'Planeada'
											: 'Borrador'}
							</span>
						</div>
						<div class="mt-3 flex items-center text-sm text-gray-500">
							<span class="font-medium text-blue-600">Ver detalles de la ruta &rarr;</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
