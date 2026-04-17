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
  <h1 class="text-4xl font-bold mb-4">Bienvenido a Route Mapper</h1>
  <p class="text-lg mb-6">Esta es una aplicación full-stack construida con Bun, SvelteKit y ElysiaJS.</p>

  <div class="bg-gray-100 p-6 rounded-lg shadow-md">
    <h2 class="text-2xl font-semibold mb-2">Estado de la API:</h2>
    {#if error}
      <p class="text-red-500 font-medium">Error: {error}</p>
    {:else if data}
      <p class="text-green-600 font-medium text-xl italic">"{data.message}"</p>
    {:else}
      <p class="text-gray-500 animate-pulse">Cargando mensaje de la API...</p>
    {/if}
  </div>

  <div class="mt-8">
    <h2 class="text-2xl font-semibold mb-2">Características:</h2>
    <ul class="list-disc list-inside space-y-2">
      <li><strong>Frontend:</strong> SvelteKit (Svelte 5)</li>
      <li><strong>Backend:</strong> ElysiaJS</li>
      <li><strong>Base de Datos:</strong> PostgreSQL + Drizzle ORM</li>
      <li><strong>Runtime:</strong> Bun</li>
    </ul>
  </div>
</main>
