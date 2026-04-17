<script lang="ts">
  let { children, type = "button", ...props } = $props();
</script>

<button
  {type}
  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
  {...props}
>
  {@render children?.()}
</button>
