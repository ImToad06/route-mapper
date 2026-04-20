<script lang="ts">
	import { fetchApi } from '$lib/api';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let showAddModal = $state(false);
	let loading = $state(false);

	let newRoute = $state({
		truckId: '',
		driverId: '',
		date: new Date().toISOString().split('T')[0],
		status: 'draft',
		selectedStores: [] as string[]
	});

	function toggleStore(storeId: string) {
		const index = newRoute.selectedStores.indexOf(storeId);
		if (index === -1) {
			newRoute.selectedStores = [...newRoute.selectedStores, storeId];
		} else {
			newRoute.selectedStores = newRoute.selectedStores.filter((id) => id !== storeId);
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		try {
			// Create Route
			const routeData = {
				truckId: newRoute.truckId,
				driverId: newRoute.driverId,
				date: newRoute.date,
				status: newRoute.status
			};

			const [createdRoute] = await fetchApi<any[]>('/rutas', {
				method: 'POST',
				body: JSON.stringify(routeData)
			});

			// Create Stops (Paradas) for the Route
			if (createdRoute && newRoute.selectedStores.length > 0) {
				const stopPromises = newRoute.selectedStores.map((storeId, idx) => {
					return fetchApi('/paradas', {
						method: 'POST',
						body: JSON.stringify({
							routeId: createdRoute.id,
							storeId: storeId,
							stopOrder: idx + 1, // Basic manual order by selection sequence
							status: 'pending'
						})
					});
				});
				await Promise.all(stopPromises);
			}

			showAddModal = false;
			newRoute = {
				truckId: '',
				driverId: '',
				date: new Date().toISOString().split('T')[0],
				status: 'draft',
				selectedStores: []
			};
			await invalidateAll();
		} catch (error) {
			console.error('Error adding ruta:', error);
			alert('Hubo un error al guardar la ruta.');
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="sm:flex sm:items-center sm:justify-between">
		<div>
			<h2
				class="text-2xl leading-7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight"
			>
				Rutas
			</h2>
			<p class="mt-1 text-sm text-gray-500">Planifica y gestiona las rutas de entrega diarias.</p>
		</div>
		<div class="mt-4 sm:mt-0 sm:ml-4">
			<button
				onclick={() => (showAddModal = true)}
				type="button"
				class="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
			>
				Crear Ruta
			</button>
		</div>
	</div>

	<!-- Tabla de rutas -->
	<div class="ring-opacity-5 overflow-hidden shadow ring-1 ring-black sm:rounded-lg">
		<table class="min-w-full divide-y divide-gray-300">
			<thead class="bg-gray-50">
				<tr>
					<th
						scope="col"
						class="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6">Fecha</th
					>
					<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
						>Camión</th
					>
					<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
						>Conductor</th
					>
					<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
						>Estado</th
					>
					<th scope="col" class="relative py-3.5 pr-4 pl-3 sm:pr-6">
						<span class="sr-only">Acciones</span>
					</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200 bg-white">
				{#each data.rutas as ruta}
					<tr>
						<td class="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6"
							>{ruta.date}</td
						>
						<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
							{data.camiones.find((c: any) => c.id === ruta.truckId)?.name || ruta.truckId}
						</td>
						<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
							{data.conductores.find((c: any) => c.id === ruta.driverId)?.name || ruta.driverId}
						</td>
						<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
							<span
								class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset
								{ruta.status === 'completed'
									? 'bg-green-50 text-green-700 ring-green-600/20'
									: ruta.status === 'in_progress'
										? 'bg-blue-50 text-blue-700 ring-blue-600/20'
										: ruta.status === 'planned'
											? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
											: 'bg-gray-50 text-gray-600 ring-gray-500/10'}"
							>
								{ruta.status === 'completed'
									? 'Completada'
									: ruta.status === 'in_progress'
										? 'En Curso'
										: ruta.status === 'planned'
											? 'Planeada'
											: 'Borrador'}
							</span>
						</td>
						<td
							class="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6"
						>
							{#if ruta.status === 'draft'}
								<button
									onclick={() => optimizeRoute(ruta.id)}
									class="mr-4 font-semibold text-green-600 hover:text-green-900">Optimizar</button
								>
							{/if}
							<button class="text-blue-600 hover:text-blue-900">Detalles</button>
						</td>
					</tr>
				{:else}
					<tr>
						<td
							colspan="5"
							class="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6 text-center"
						>
							No hay rutas registradas.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Modal Añadir -->
	{#if showAddModal}
		<div class="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
			<div class="bg-opacity-75 fixed inset-0 bg-gray-500 transition-opacity"></div>

			<div class="fixed inset-0 z-10 w-screen overflow-y-auto">
				<div
					class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
				>
					<div
						class="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6"
					>
						<div>
							<h3 class="text-base leading-6 font-semibold text-gray-900" id="modal-title">
								Crear Nueva Ruta
							</h3>
							<div class="mt-4">
								<form onsubmit={handleSubmit}>
									<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<div>
											<label for="date" class="block text-sm leading-6 font-medium text-gray-900"
												>Fecha de la ruta</label
											>
											<input
												type="date"
												id="date"
												bind:value={newRoute.date}
												required
												class="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:text-sm sm:leading-6"
											/>
										</div>
										<div>
											<label for="status" class="block text-sm leading-6 font-medium text-gray-900"
												>Estado inicial</label
											>
											<select
												id="status"
												bind:value={newRoute.status}
												required
												class="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:text-sm sm:leading-6"
											>
												<option value="draft">Borrador</option>
												<option value="planned">Planeada</option>
											</select>
										</div>
										<div>
											<label for="truck" class="block text-sm leading-6 font-medium text-gray-900"
												>Camión</label
											>
											<select
												id="truck"
												bind:value={newRoute.truckId}
												required
												class="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:text-sm sm:leading-6"
											>
												<option value="" disabled>Seleccione un camión</option>
												{#each data.camiones as truck}
													<option value={truck.id}>{truck.name} - {truck.licensePlate}</option>
												{/each}
											</select>
										</div>
										<div>
											<label for="driver" class="block text-sm leading-6 font-medium text-gray-900"
												>Conductor</label
											>
											<select
												id="driver"
												bind:value={newRoute.driverId}
												required
												class="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:text-sm sm:leading-6"
											>
												<option value="" disabled>Seleccione un conductor</option>
												{#each data.conductores as driver}
													<option value={driver.id}>{driver.name}</option>
												{/each}
											</select>
										</div>
										<div class="mt-2 sm:col-span-2">
											<label class="mb-2 block text-sm leading-6 font-medium text-gray-900"
												>Seleccionar Tiendas a Visitar</label
											>
											<div
												class="h-48 space-y-2 overflow-y-auto rounded-md border border-gray-300 bg-gray-50 p-2"
											>
												{#each data.tiendas as tienda}
													<label
														class="flex cursor-pointer items-center space-x-3 rounded border border-gray-200 bg-white p-2 hover:bg-blue-50"
													>
														<input
															type="checkbox"
															checked={newRoute.selectedStores.includes(tienda.id)}
															onchange={() => toggleStore(tienda.id)}
															class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
														/>
														<span class="text-sm font-medium text-gray-900">{tienda.name}</span>
														<span class="text-xs text-gray-500">({tienda.address})</span>
													</label>
												{:else}
													<p class="text-sm text-gray-500 text-center py-4">
														No hay tiendas disponibles.
													</p>
												{/each}
											</div>
											<p class="mt-2 text-xs text-gray-500">
												En la siguiente fase, estas tiendas seleccionadas serán ordenadas
												automáticamente por el optimizador de rutas.
											</p>
										</div>
									</div>
									<div class="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
										<button
											type="submit"
											disabled={loading}
											class="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 sm:col-start-2"
										>
											{loading ? 'Guardando...' : 'Crear Ruta'}
										</button>
										<button
											type="button"
											onclick={() => (showAddModal = false)}
											class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50 sm:col-start-1 sm:mt-0"
										>
											Cancelar
										</button>
									</div>
								</form>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
