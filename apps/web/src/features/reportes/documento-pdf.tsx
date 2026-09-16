import { Document, Page, pdf, StyleSheet, Text, View } from '@react-pdf/renderer'
import { descargarBlob } from '@/lib/api'

const estilos = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica' },
  encabezado: { marginBottom: 16 },
  titulo: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  subtitulo: { fontSize: 10, color: '#555555' },
  fila: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
    paddingVertical: 4,
  },
  filaEncabezado: { backgroundColor: '#f3f3f3', fontFamily: 'Helvetica-Bold' },
  celda: { flex: 1, paddingHorizontal: 4 },
})

interface DocumentoReporteProps {
  titulo: string
  periodo: string
  columnas: string[]
  filas: (string | number)[][]
}

/** Documento PDF genérico (una tabla) para los reportes; se usa con pdf(...).toBlob(). */
function DocumentoReporte({ titulo, periodo, columnas, filas }: DocumentoReporteProps) {
  return (
    <Document>
      <Page size="A4" style={estilos.page}>
        <View style={estilos.encabezado}>
          <Text style={estilos.titulo}>Rutas L&H Distribuciones</Text>
          <Text style={estilos.subtitulo}>
            {titulo} · {periodo}
          </Text>
        </View>
        <View>
          <View style={[estilos.fila, estilos.filaEncabezado]}>
            {columnas.map((c) => (
              <Text key={c} style={estilos.celda}>
                {c}
              </Text>
            ))}
          </View>
          {filas.map((fila, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: las filas no tienen un id propio.
            <View key={i} style={estilos.fila}>
              {fila.map((valor, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: las columnas no tienen un id propio.
                <Text key={j} style={estilos.celda}>
                  {String(valor)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

/** Genera el PDF en el navegador (mismos datos que la tabla) y dispara la descarga. */
export async function exportarReportePdf(
  props: DocumentoReporteProps,
  nombreArchivo: string,
): Promise<void> {
  const blob = await pdf(<DocumentoReporte {...props} />).toBlob()
  descargarBlob(blob, nombreArchivo)
}
