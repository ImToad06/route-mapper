<script lang="ts">
	let { data } = $props();
</script>

<div class="space-y-6">
	<div class="sm:flex sm:items-center sm:justify-between">
		<div>
			<h2
				class="text-2xl leading-7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight"
			>
				Conductores
			</h2>
			<p class="mt-1 text-sm text-gray-500">Lista de usuarios con rol de conductor (driver).</p>
		</div>
	</div>

	<!-- Tabla de conductores -->
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
						>Email</th
					>
					<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Rol</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200 bg-white">
				{#each data.conductores as conductor}
					<tr>
						<td class="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6"
							>{conductor.name}</td
						>
						<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">{conductor.email}</td>
						<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
							<span
								class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-600/20 ring-inset"
							>
								Conductor
							</span>
						</td>
					</tr>
				{:else}
					<tr>
						<td
							colspan="3"
							class="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6 text-center"
						>
							No hay conductores registrados. Para añadir conductores, cree un usuario con rol
							'driver' usando Better Auth.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
