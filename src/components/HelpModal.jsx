import { X, BookOpen, Download, TrendingUp, BarChart3, Settings } from 'lucide-react'

export default function HelpModal({ onClose }) {
  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700 shrink-0">
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Guía de Uso</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800">
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Inicio rápido */}
          <section id="inicio" className="space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              🚀 Inicio Rápido
            </h3>
            <div className="bg-zinc-800/30 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm text-zinc-300">
              <p><strong>1. Abre la app</strong> en tu navegador (http://localhost:5173 si es local)</p>
              <p><strong>2. Añade tu primera inversión:</strong> botón "+ Añadir" en el header</p>
              <p><strong>3. Configura API key (opcional):</strong> ⚙️ Ajustes → pega tu clave de Twelve Data para precios automáticos de acciones/ETFs</p>
              <p><strong>4. Importa tu historial (recomendado):</strong> botón "Importar" → sube CSV de Trade Republic</p>
            </div>
          </section>

          {/* Vistas principales */}
          <section id="vistas" className="space-y-3">
            <h3 className="text-base font-semibold text-white">📊 Dos Vistas Principales</h3>
            <div className="space-y-3">
              {/* Cartera */}
              <div className="bg-zinc-800/30 border border-zinc-800 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-white flex items-center gap-2">
                  <TrendingUp size={14} />
                  Cartera — Tu portfolio actual
                </p>
                <ul className="text-sm text-zinc-300 space-y-1 ml-2 list-disc">
                  <li><strong>Cards resumen:</strong> valor total, P&L realizado y no realizado</li>
                  <li><strong>Gráfico circular:</strong> cómo está distribuida tu cartera (por tipo de activo o por posición)</li>
                  <li><strong>Tabla de posiciones:</strong> cada activo, unidades, precio actual, P&L</li>
                  <li><strong>Filtros:</strong> por categoría (Acciones/ETFs/Cripto), estado (abierta/cerrada) o búsqueda</li>
                </ul>
              </div>

              {/* Rendimiento */}
              <div className="bg-zinc-800/30 border border-zinc-800 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-white flex items-center gap-2">
                  <BarChart3 size={14} />
                  Rendimiento — Análisis por período
                </p>
                <ul className="text-sm text-zinc-300 space-y-1 ml-2 list-disc">
                  <li><strong>Período:</strong> últimos 7 días, mes actual, año actual, todo o personalizado</li>
                  <li><strong>Métricas:</strong> P&L realizado, nº de operaciones, mejor y peor activo</li>
                  <li><strong>Tabla de operaciones:</strong> todas las compras y ventas del período con P&L individual</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Gestión de posiciones */}
          <section id="posiciones" className="space-y-3">
            <h3 className="text-base font-semibold text-white">🎯 Gestionar Posiciones</h3>
            <div className="bg-zinc-800/30 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm text-zinc-300">
              <p><strong>Añadir una inversión:</strong> "+ Añadir" → selecciona tipo (Acción/ETF/Cripto) → busca el símbolo → introduce cantidad, precio y fecha</p>
              <p><strong>Ver historial de una posición:</strong> haz clic en la fila de cualquier activo para expandir y ver todas sus compras/ventas</p>
              <p><strong>Editar una operación:</strong> expande la posición → haz clic en el lápiz ✏️ en la operación que quieras cambiar</p>
              <p><strong>Eliminar una operación:</strong> expande → haz clic en la papelera 🗑️</p>
              <p><strong>Cambiar ticker de una posición:</strong> haz clic directamente en el símbolo (ej: AAPL) en la tabla para editar</p>
            </div>
          </section>

          {/* Precios */}
          <section id="precios" className="space-y-3">
            <h3 className="text-base font-semibold text-white">💰 Precios y API</h3>
            <div className="bg-zinc-800/30 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm text-zinc-300">
              <p><strong>Precios automáticos:</strong> la app obtiene precios en tiempo real de Twelve Data (acciones/ETFs) y CoinGecko (cripto)</p>
              <p><strong>Requiere API key:</strong> para acciones y ETFs necesitas una clave de Twelve Data (gratuita, obtén una en twelvedata.com)</p>
              <p><strong>Limitaciones:</strong> plan gratuito = 800 requests/día. La app refresica cada 60 segundos pero solo de posiciones abiertas</p>
              <p><strong>Precio manual:</strong> si un activo no tiene precio automático (ej: oro/plata de LSE), haz clic en "✏ precio" y introduce manualmente. El icono ⚠️ amarillo indica precios manuales</p>
              <p><strong>Conversión EUR/USD:</strong> si añades una posición en EUR, se convierte automáticamente a USD para almacenamiento, pero se calcula todo en la moneda de visualización</p>
            </div>
          </section>

          {/* Importar CSV */}
          <section id="import" className="space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Download size={14} />
              Importar desde Trade Republic
            </h3>
            <div className="bg-zinc-800/30 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm text-zinc-300">
              <p><strong>Pasos:</strong></p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>En Trade Republic app: Perfil → Documentos → selecciona período → Exportar como CSV</li>
                <li>Abre la app → botón "Importar" → sube el CSV</li>
                <li>La app detecta automáticamente:
                  <ul className="list-disc ml-4 mt-1 space-y-0.5">
                    <li>Compras y ventas (ignora transferencias, pagos, dividendos)</li>
                    <li>Tickers por ISIN usando búsqueda de Twelve Data</li>
                    <li>Tipo de activo (Acción/ETF/Cripto)</li>
                  </ul>
                </li>
                <li>Revisa la tabla de preview (campos en naranja = necesitan edición manual)</li>
                <li>Confirma importación</li>
              </ol>
              <p className="text-xs text-zinc-500 mt-2">💡 Si el CSV no incluye todo tu historial, exporta un período mayor (desde el inicio de tu cuenta)</p>
            </div>
          </section>

          {/* Cálculos */}
          <section id="calculos" className="space-y-3">
            <h3 className="text-base font-semibold text-white">📐 Cómo Calcula la App</h3>
            <div className="bg-zinc-800/30 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm text-zinc-300">
              <p><strong>Coste base (FIFO):</strong> promedio ponderado de todas las compras</p>
              <p><strong>P&L realizado:</strong> ganancias/pérdidas de operaciones cerradas (ventas)</p>
              <p><strong>P&L no realizado:</strong> diferencia entre precio actual y coste base en posiciones abiertas</p>
              <p><strong>Comisiones:</strong> se incluyen en el coste base de compra, no se restan del P&L de venta (como lo hace tu broker)</p>
              <p><strong>Moneda:</strong> todo se almacena en USD internamente, pero se visualiza en EUR o USD según tu preferencia</p>
            </div>
          </section>

          {/* Ajustes */}
          <section id="ajustes" className="space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Settings size={14} />
              Ajustes
            </h3>
            <div className="bg-zinc-800/30 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm text-zinc-300">
              <p><strong>API Key:</strong> clave de Twelve Data para precios de acciones/ETFs</p>
              <p><strong>Borrar datos:</strong> elimina TODAS las transacciones (no se puede deshacer)</p>
              <p className="text-xs text-zinc-500">Los datos se guardan localmente en tu navegador. Si limpias el cache del navegador, se pierden.</p>
            </div>
          </section>

          {/* Tips */}
          <section id="tips" className="space-y-3">
            <h3 className="text-base font-semibold text-white">💡 Consejos</h3>
            <ul className="bg-zinc-800/30 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm text-zinc-300 list-disc list-inside">
              <li>Los datos se guardan automáticamente — no hay botón "Guardar"</li>
              <li>Si importas un activo con ticker incorrecto, haz clic en el símbolo para corregirlo de una vez</li>
              <li>El P&L total incluye realizado + no realizado. En la pestaña Rendimiento ves solo el realizado por período</li>
              <li>Cambia EUR/USD en el header para visualizar todo en la moneda que prefieras</li>
              <li>El botón ↻ de Refresh actualiza precios manualmente (automático cada 60 segundos)</li>
            </ul>
          </section>

          {/* Soporte */}
          <section id="soporte" className="space-y-3">
            <h3 className="text-base font-semibold text-white">❓ ¿Dudas?</h3>
            <div className="bg-zinc-800/30 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300">
              <p>Esta es una app personal. Los datos se guardan solo en tu navegador — privado, sin servidores externos.</p>
              <p className="text-xs text-zinc-500 mt-2">Última actualización: 2026</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-700 shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
