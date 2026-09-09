import { useDeferredValue, useState } from 'react'

/** Estado común de las listas de catálogo: búsqueda diferida, página y filtro de activos. */
export function useLista() {
  const [buscar, setBuscar] = useState('')
  const [pagina, setPagina] = useState(1)
  const [soloActivos, setSoloActivos] = useState(true)
  const buscarDiferido = useDeferredValue(buscar.trim())
  return {
    buscar,
    setBuscar: (v: string) => {
      setBuscar(v)
      setPagina(1)
    },
    pagina,
    setPagina,
    soloActivos,
    setSoloActivos: (v: boolean) => {
      setSoloActivos(v)
      setPagina(1)
    },
    filtros: {
      pagina,
      porPagina: 20,
      buscar: buscarDiferido || undefined,
      activo: soloActivos ? true : undefined,
    },
  }
}
