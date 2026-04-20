<script lang="ts">
	import { fetchApi } from '$lib/api';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data } = $props();

	let showAddModal = $state(false);
	let loading = $state(false);

	let newTienda = $state({
		name: '',
		address: '',
		latitude: 4.6097, // Default Bogotá
		longitude: -74.0817,
		contactInfo: ''
	});

	let mapContainer: HTMLElement;
	let map: any;
	let marker: any;

	$effect(() => {
		if (showAddModal && mapContainer && !map) {
			// Initialize map only when modal is open and mapContainer is available
			import('leaflet').then((L) => {
				// Avoid double init
				if (mapContainer._leaflet_id) return;

				map = L.map(mapContainer).setView([newTienda.latitude, newTienda.longitude], 13);
				L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: '&copy; OpenStreetMap contributors'
				}).addTo(map);

				marker = L.marker([newTienda.latitude, newTienda.longitude], { draggable: true }).addTo(
					map
				);

				marker.on('dragend', function (e: any) {
					const position = marker.getLatLng();
					newTienda.latitude = position.lat;
					newTienda.longitude = position.lng;
				});

				map.on('click', function (e: any) {
					marker.setLatLng(e.latlng);
					newTienda.latitude = e.latlng.lat;
					newTienda.longitude = e.latlng.lng;
				});

				// Fix map render issue in modals
				setTimeout(() => {
					map.invalidateSize();
				}, 100);
			});
		} else if (!showAddModal && map) {
			map.remove();
			map = null;
			marker = null;
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		try {
			await fetchApi('/tiendas', {
				method: 'POST',
				body: JSON.stringify(newTienda)
			});
			showAddModal = false;
			newTienda = { name: '', address: '', latitude: 4.6097, longitude: -74.0817, contactInfo: '' };
			await invalidateAll();
		} catch (error) {
			console.error('Error adding tienda:', error);
			alert('Hubo un error al guardar la tienda.');
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
</svelte:head>

<div class="space-y-6">
	<div class="sm:flex sm:items-center sm:justify-between">
		<div>
			<h2
				class="text-2xl leading-7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight"
			>
				Tiendas
			</h2>
			<p class="mt-1 text-sm text-gray-500">Directorio de tiendas de conveniencia.</p>
		</div>
		<div class="mt-4 sm:mt-0 sm:ml-4">
			<button
				onclick={() => (showAddModal = true)}
				type="button"
				class="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
			>
				Añadir Tienda
			</button>
		</div>
	</div>

	<!-- Tabla de tiendas -->
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
						>Dirección</th
					>
					<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
						>Contacto</th
					>
					<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
						>Coordenadas</th
					>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200 bg-white">
				{#each data.tiendas as tienda}
					<tr>
						<td class="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6"
							>{tienda.name}</td
						>
						<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">{tienda.address}</td>
						<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500"
							>{tienda.contactInfo || '-'}</td
						>
						<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500"
							>{tienda.latitude.toFixed(4)}, {tienda.longitude.toFixed(4)}</td
						>
					</tr>
				{:else}
					<tr>
						<td
							colspan="4"
							class="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6 text-center"
						>
							No hay tiendas registradas.
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
								Añadir Nueva Tienda
							</h3>
							<div class="mt-4">
								<form onsubmit={handleSubmit}>
									<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<div class="sm:col-span-2">
											<label for="name" class="block text-sm leading-6 font-medium text-gray-900"
												>Nombre de la tienda</label
											>
											<input
												type="text"
												id="name"
												bind:value={newTienda.name}
												required
												class="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:text-sm sm:leading-6"
											/>
										</div>
										<div class="sm:col-span-2">
											<label for="address" class="block text-sm leading-6 font-medium text-gray-900"
												>Dirección</label
											>
											<input
												type="text"
												id="address"
												bind:value={newTienda.address}
												required
												class="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:text-sm sm:leading-6"
											/>
										</div>
										<div class="sm:col-span-2">
											<label for="contact" class="block text-sm leading-6 font-medium text-gray-900"
												>Información de Contacto</label
											>
											<input
												type="text"
												id="contact"
												bind:value={newTienda.contactInfo}
												class="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:text-sm sm:leading-6"
											/>
										</div>
										<div class="sm:col-span-2">
											<label class="mb-2 block text-sm leading-6 font-medium text-gray-900"
												>Ubicación en el mapa</label
											>
											<p class="mb-2 text-xs text-gray-500">
												Arrastra el marcador o haz clic en el mapa para establecer la ubicación.
											</p>
											<!-- svelte-ignore a11y_no_static_element_interactions -->
											<div
												bind:this={mapContainer}
												class="h-64 w-full rounded-md border border-gray-300"
											></div>
										</div>
									</div>
									<div class="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
										<button
											type="submit"
											disabled={loading}
											class="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 sm:col-start-2"
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
