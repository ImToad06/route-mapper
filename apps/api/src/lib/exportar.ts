import ExcelJS from 'exceljs'

interface Columna {
  encabezado: string
  clave: string
  ancho?: number
}

interface Hoja {
  nombre: string
  columnas: Columna[]
  filas: Record<string, unknown>[]
}

/** Arma un libro .xlsx (una hoja por entrada) con encabezado en negrita y columnas anchas. */
export async function libroXlsx(hojas: Hoja[]) {
  const libro = new ExcelJS.Workbook()
  libro.creator = 'Rutas L&H'
  libro.created = new Date()
  for (const hoja of hojas) {
    const ws = libro.addWorksheet(hoja.nombre)
    ws.columns = hoja.columnas.map((c) => ({
      header: c.encabezado,
      key: c.clave,
      width: c.ancho ?? 22,
    }))
    ws.getRow(1).font = { bold: true }
    ws.addRows(hoja.filas)
  }
  return libro.xlsx.writeBuffer()
}

/** Respuesta HTTP de descarga para un buffer .xlsx ya generado. */
export function respuestaXlsx(buffer: ExcelJS.Buffer, nombreArchivo: string): Response {
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    },
  })
}
