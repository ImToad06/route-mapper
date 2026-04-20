<script lang="ts">
	import { page } from '$app/state';
	import '../../../app.css';
	let { children } = $props();
</script>

<div class="flex h-screen bg-gray-100 font-sans text-gray-900">
	<!-- Sidebar -->
	<aside class="w-64 flex-shrink-0 bg-white shadow-md">
		<div class="p-6">
			<h1 class="text-2xl font-bold text-blue-600">Route Mapper</h1>
			<p class="mt-1 text-sm text-gray-500">L&H Distributor</p>
		</div>
		<nav class="mt-6 px-4">
			<ul class="space-y-2">
				<li>
					<a
						href="/dashboard"
						class="block rounded-md px-4 py-2 transition-colors {page.url.pathname === '/dashboard'
							? 'bg-blue-50 font-medium text-blue-700'
							: 'text-gray-700 hover:bg-gray-50'}"
					>
						Panel Principal
					</a>
				</li>
				<li>
					<a
						href="/dashboard/rutas"
						class="block rounded-md px-4 py-2 transition-colors {page.url.pathname.startsWith(
							'/dashboard/rutas'
						)
							? 'bg-blue-50 font-medium text-blue-700'
							: 'text-gray-700 hover:bg-gray-50'}"
					>
						Rutas
					</a>
				</li>
				<li>
					<a
						href="/dashboard/camiones"
						class="block rounded-md px-4 py-2 transition-colors {page.url.pathname.startsWith(
							'/dashboard/camiones'
						)
							? 'bg-blue-50 font-medium text-blue-700'
							: 'text-gray-700 hover:bg-gray-50'}"
					>
						Camiones
					</a>
				</li>
				<li>
					<a
						href="/dashboard/tiendas"
						class="block rounded-md px-4 py-2 transition-colors {page.url.pathname.startsWith(
							'/dashboard/tiendas'
						)
							? 'bg-blue-50 font-medium text-blue-700'
							: 'text-gray-700 hover:bg-gray-50'}"
					>
						Tiendas
					</a>
				</li>
				<li>
					<a
						href="/dashboard/conductores"
						class="block rounded-md px-4 py-2 transition-colors {page.url.pathname.startsWith(
							'/dashboard/conductores'
						)
							? 'bg-blue-50 font-medium text-blue-700'
							: 'text-gray-700 hover:bg-gray-50'}"
					>
						Conductores
					</a>
				</li>
			</ul>
		</nav>
	</aside>

	<!-- Main Content -->
	<main class="flex-1 overflow-auto bg-gray-50">
		<header class="flex h-16 items-center justify-end bg-white px-6 shadow-sm">
			<div class="flex items-center space-x-4">
				<span class="text-sm font-medium text-gray-700">Administrador / Gerente</span>
				<div
					class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-bold text-white"
				>
					A
				</div>
			</div>
		</header>
		<div class="p-6">
			{@render children()}
		</div>
	</main>
</div>
