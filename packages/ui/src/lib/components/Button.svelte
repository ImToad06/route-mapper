<script lang="ts">
	let { children, type = 'button', ...props } = $props();
</script>

<button
	{type}
	class="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700"
	{...props}
>
	{@render children?.()}
</button>
