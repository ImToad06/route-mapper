<script lang="ts">
	import '../../app.css';
	let { children } = $props();
</script>

<div class="flex min-h-screen flex-col bg-gray-50 font-sans text-gray-900">
	<!-- Mobile Header -->
	<header
		class="flex h-14 shrink-0 items-center justify-between bg-blue-600 px-4 text-white shadow-md"
	>
		<h1 class="text-lg font-bold">L&H Driver</h1>
		<a href="/conductor" class="text-sm font-medium hover:text-blue-100">Mis Rutas</a>
	</header>

	<!-- Main Content Area (scrollable) -->
	<main class="flex-1 overflow-y-auto p-4 pb-16">
		{@render children()}
	</main>

	<!-- Mobile Bottom Nav (optional) -->
	<nav
		class="fixed bottom-0 flex h-14 w-full items-center justify-around border-t border-gray-200 bg-white text-gray-500"
	>
		<a
			href="/conductor"
			class="flex h-full w-full flex-col items-center justify-center text-blue-600"
		>
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
				/>
			</svg>
			<span class="text-xs font-medium">Rutas</span>
		</a>
		<a
			href="/conductor/perfil"
			class="flex h-full w-full flex-col items-center justify-center hover:text-blue-600"
		>
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
				/>
			</svg>
			<span class="text-xs font-medium">Perfil</span>
		</a>
	</nav>
</div>
