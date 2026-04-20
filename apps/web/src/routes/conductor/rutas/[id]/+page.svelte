<script lang="ts">
	import { fetchApi } from '$lib/api';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	let ruta = $derived(data.ruta);

	let loading = $state(false);

	async function updateRouteStatus(newStatus: string) {
		loading = true;
		try {
			await fetchApi(`/rutas/${ruta.id}`, {
				method: 'PUT',
				body: JSON.stringify({ status: newStatus })
			});
			await invalidateAll();
		} catch (error) {
			console.error('Error updating route:', error);
			alert('Error al actualizar el estado de la ruta.');
		} finally {
			loading = false;
		}
	}

	async function markStopComplete(stopId: string) {
		loading = true;
		try {
			await fetchApi(`/paradas/${stopId}`, {
				method: 'PUT',
				body: JSON.stringify({ status: 'completed' })
			});
			await invalidateAll();
		} catch (error) {
			console.error('Error updating stop:', error);
			alert('Error al actualizar el estado de la parada.');
		} finally {
			loading = false;
		}
	}

	function getNavigationLink(lat: number, lng: number) {
		// Deep link for Google Maps, works well on mobile
		return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
	}
</script>

{#if !ruta}
	<div class="py-12 text-center">
		<h2 class="text-xl font-bold text-gray-900">Ruta no encontrada</h2>
		<p class="mt-2 text-gray-500">La ruta que intentas ver no existe o hubo un error.</p>
		<a href="/conductor" class="mt-4 inline-block font-medium text-blue-600">Volver a mis rutas</a>
	</div>
{:else}
	<div class="space-y-6">
		<!-- Header -->
		<div
			class="flex flex-col rounded-lg border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
		>
			<div>
				<h2 class="text-xl font-bold text-gray-900">Ruta del {ruta.date}</h2>
				<div class="mt-1 flex items-center space-x-2">
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
					<span class="text-sm text-gray-500">• {ruta.stops.length} paradas</span>
				</div>
			</div>

			<div class="mt-4 sm:mt-0">
				{#if ruta.status === 'planned'}
					<button
						onclick={() => updateRouteStatus('in_progress')}
						disabled={loading}
						class="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
					>
						Iniciar Ruta
					</button>
				{:else if ruta.status === 'in_progress'}
					<button
						onclick={() => updateRouteStatus('completed')}
						disabled={loading}
						class="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50 sm:w-auto"
					>
						Finalizar Ruta
					</button>
				{/if}
			</div>
		</div>

		<!-- Stops List -->
		<div>
			<h3 class="mb-3 text-lg font-semibold text-gray-900">Paradas</h3>

			<div class="relative space-y-4">
				{#if ruta.stops.length === 0}
					<p class="py-4 text-center text-gray-500">No hay paradas en esta ruta.</p>
				{/if}

				<!-- Line connecting the timeline -->
				{#if ruta.stops.length > 1}
					<div class="absolute top-8 bottom-8 left-6 z-0 hidden w-0.5 bg-gray-200 sm:block"></div>
				{/if}

				{#each ruta.stops as stop, index}
					<div
						class="rounded-lg border bg-white shadow-sm {stop.status === 'completed'
							? 'border-green-200 bg-green-50/30'
							: 'border-gray-200'} relative z-10 p-4"
					>
						<div class="flex items-start">
							<!-- Sequence Number -->
							<div class="mt-1 mr-4 flex-shrink-0">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold
									{stop.status === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}"
								>
									{#if stop.status === 'completed'}
										<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M5 13l4 4L19 7"
											></path>
										</svg>
									{:else}
										{stop.stopOrder}
									{/if}
								</div>
							</div>

							<!-- Stop Details -->
							<div class="flex-1">
								<h4 class="text-base font-bold text-gray-900">
									{stop.store?.name || 'Tienda Desconocida'}
								</h4>
								<p class="mt-1 text-sm text-gray-600">{stop.store?.address}</p>

								<div class="mt-4 flex flex-wrap gap-2">
									<a
										href={getNavigationLink(stop.store?.latitude, stop.store?.longitude)}
										target="_blank"
										class="inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
									>
										<svg
											class="mr-1.5 h-4 w-4 text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
											></path>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
											></path>
										</svg>
										Navegar
									</a>

									{#if stop.status !== 'completed' && ruta.status === 'in_progress'}
										<button
											onclick={() => markStopComplete(stop.id)}
											disabled={loading}
											class="inline-flex items-center rounded border border-transparent bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
										>
											<svg
												class="mr-1.5 h-4 w-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M5 13l4 4L19 7"
												></path>
											</svg>
											Marcar Entregado
										</button>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
