<script lang="ts">
	import { fetchApi } from '$lib/api';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let showAddModal = $state(false);
	let loading = $state(false);

	let newCamion = $state({
		name: '',
		licensePlate: '',
		capacity: 0,
		status: 'active'
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		try {
			await fetchApi('/camiones', {
				method: 'POST',
				body: JSON.stringify(newCamion)
			});
			showAddModal = false;
			newCamion = { name: '', licensePlate: '', capacity: 0, status: 'active' };
			await invalidateAll(); // Reload the data
		} catch (error) {
			console.error('Error adding camion:', error);
			alert('Hubo un error al guardar el camión.');
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
				Camiones
			</h2>
			<p class="mt-1 text-sm text-gray-500">
				Gestiona los camiones disponibles para la distribución.
			</p>
		</div>
		<div class="mt-4 sm:mt-0 sm:ml-4">
			<button
				onclick={() => (showAddModal = true)}
				type="button"
				class="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
			>
				Añadir Camión
			</button>
		</div>
	</div>

	<!-- Tabla de camiones -->
	<div class="ring-opacity-5 overflow-hidden shadow ring-1 ring-black sm:rounded-lg">
		<table class="min-w-full divide-y divide-gray-300">
			<thead class="bg-gray-50">
				<tr>
					<th
						scope="col"
						class="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6"
						>Nombre</th
					>
					<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
						>Placa</th
					>
					<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
						>Capacidad</th
					>
					<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
						>Estado</th
					>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200 bg-white">
				{#each data.camiones as camion}
					<tr>
						<td class="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6"
							>{camion.name}</td
						>
						<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">{camion.licensePlate}</td>
						<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">{camion.capacity}</td>
						<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
							<span
								class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset
								{camion.status === 'active'
									? 'bg-green-50 text-green-700 ring-green-600/20'
									: camion.status === 'maintenance'
										? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
										: 'bg-gray-50 text-gray-600 ring-gray-500/10'}"
							>
								{camion.status === 'active'
									? 'Activo'
									: camion.status === 'maintenance'
										? 'Mantenimiento'
										: 'Inactivo'}
							</span>
						</td>
					</tr>
				{:else}
					<tr>
						<td
							colspan="4"
							class="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6 text-center"
						>
							No hay camiones registrados.
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
						class="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
					>
						<div>
							<h3 class="text-base leading-6 font-semibold text-gray-900" id="modal-title">
								Añadir Nuevo Camión
							</h3>
							<div class="mt-4">
								<form onsubmit={handleSubmit}>
									<div class="space-y-4">
										<div>
											<label for="name" class="block text-sm leading-6 font-medium text-gray-900"
												>Nombre / Modelo</label
											>
											<div class="mt-2">
												<input
													type="text"
													id="name"
													bind:value={newCamion.name}
													required
													class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:text-sm sm:leading-6"
												/>
											</div>
										</div>
										<div>
											<label for="plate" class="block text-sm leading-6 font-medium text-gray-900"
												>Placa</label
											>
											<div class="mt-2">
												<input
													type="text"
													id="plate"
													bind:value={newCamion.licensePlate}
													required
													class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:text-sm sm:leading-6"
												/>
											</div>
										</div>
										<div>
											<label
												for="capacity"
												class="block text-sm leading-6 font-medium text-gray-900"
												>Capacidad (volumen/peso)</label
											>
											<div class="mt-2">
												<input
													type="number"
													id="capacity"
													bind:value={newCamion.capacity}
													required
													min="1"
													class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:text-sm sm:leading-6"
												/>
											</div>
										</div>
										<div>
											<label for="status" class="block text-sm leading-6 font-medium text-gray-900"
												>Estado</label
											>
											<div class="mt-2">
												<select
													id="status"
													bind:value={newCamion.status}
													class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:text-sm sm:leading-6"
												>
													<option value="active">Activo</option>
													<option value="maintenance">Mantenimiento</option>
													<option value="inactive">Inactivo</option>
												</select>
											</div>
										</div>
									</div>
									<div class="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
										<button
											type="submit"
											disabled={loading}
											class="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 sm:col-start-2"
										>
											{loading ? 'Guardando...' : 'Guardar'}
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
