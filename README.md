# Gestión de Inversiones

Una app web moderna para rastrear y analizar tu portafolio de inversiones en **acciones, ETFs y criptomonedas**.

## 🎯 Finalidad

- **Unificar tu portafolio**: Gestiona todos tus activos en un lugar
- **Rastrear P&L**: Calcula ganancias/pérdidas en tiempo real con precisión
- **Análisis histórico**: Importa tu historial de operaciones desde Trade Republic
- **Moneda flexible**: Cambia entre EUR y USD sin perder precisión
- **100% privado**: Los datos se guardan solo en tu navegador, sin servidores externos

## 🚀 Características

### Cartera
- **Posiciones abiertas y cerradas** con desglose por tipo de activo
- **Gráfico de asignación** (donut): visualiza tu exposición
- **Tabla de posiciones** con:
  - Unidades y precio actual
  - Coste medio ponderado
  - P&L realizado, no realizado y total
  - Historial de operaciones expandible

### Rendimiento
- **Análisis por período**: últimos 7 días, mes, año, todo o personalizado
- **Estadísticas**: P&L realizado, operaciones, mejor/peor activo
- **Tabla detallada** de todas las compras y ventas del período

### Precios en Tiempo Real
- **Twelve Data**: acciones y ETFs (requiere API key gratuita)
- **CoinGecko**: criptomonedas (totalmente gratuito)
- **Precio manual**: para activos sin cobertura API
- **Conversión EUR/USD**: automática con tasa de cambio en caché

### Importación
- **CSV desde Trade Republic**: sube tu historial completo
- **Detección automática** de tickers y tipos de activo
- **Detección de duplicados**: evita importar la misma operación dos veces

### Cálculos
- **Coste base**: promedio ponderado de compras
- **P&L realizado**: ganancias/pérdidas de operaciones cerradas
- **P&L no realizado**: diferencia entre precio actual y coste
- **Comisiones**: incluidas en el coste de compra (como los brokers)

## 🛠️ Stack

- **React 18** + Hooks (useState, useMemo, useCallback, useEffect)
- **Vite**: bundler ultrarrápido
- **Tailwind CSS v4**: estilos modernos
- **localStorage**: persistencia sin servidor
- **APIs**: Twelve Data, CoinGecko

## 📋 Requisitos

- Node.js 16+
- npm o yarn

## 🚀 Instalación

```bash
# Clonar el repo
git clone https://github.com/TU_USUARIO/GestionInversiones.git
cd GestionInversiones

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre `http://localhost:5173` en tu navegador.

## ⚙️ Configuración

### API Key de Twelve Data (opcional pero recomendado)

1. Regístrate en **[twelvedata.com](https://twelvedata.com)**
2. Obtén tu API key gratuita (800 requests/día)
3. En la app: ⚙️ Ajustes → pega tu clave

Sin API key, verás precios de criptomonedas pero no de acciones/ETFs.

## 📊 Uso Rápido

1. **Añadir una inversión**: botón "+ Añadir" → selecciona tipo → busca símbolo
2. **Importar historial**: botón "Importar" → sube CSV de Trade Republic
3. **Ver rendimiento**: pestaña "Rendimiento" → selecciona período
4. **Cambiar moneda**: botón EUR/USD en el header

## 📁 Estructura del Proyecto

```
src/
├── components/          # React components
│   ├── Header.jsx
│   ├── SummaryCards.jsx
│   ├── AllocationChart.jsx
│   ├── PositionsTable.jsx
│   ├── TransactionForm.jsx
│   ├── PerformanceView.jsx
│   ├── ImportModal.jsx
│   ├── SettingsModal.jsx
│   └── HelpModal.jsx
├── hooks/              # Custom React hooks
│   ├── useTransactions.js
│   ├── usePrices.js
│   └── useLocalStorage.js
├── services/           # API integrations
│   ├── coinGecko.js
│   ├── twelveData.js
│   └── priceService.js
├── utils/              # Utilities
│   ├── calculations.js
│   ├── csvParser.js
│   ├── formatters.js
│   └── periodFilters.js
├── constants/
│   └── index.js
└── App.jsx
```

## 💾 Almacenamiento Local

Todos los datos se guardan en `localStorage`:
- Transacciones (JSON)
- Precios manuales (JSON)
- Moneda preferida (EUR/USD)
- API key de Twelve Data (encriptada en el navegador)

Para borrar todos los datos: ⚙️ Ajustes → "Borrar todos los datos"

## 🔄 Workflow de Desarrollo

```bash
# Desarrollo
npm run dev

# Build producción
npm run build

# Preview del build
npm run preview
```

## 🐛 Limitaciones Conocidas

- **Twelve Data free tier**: no cubre todas las bolsas (LSE, Euronext con limitaciones)
- **Tasa de cambio EUR/USD**: se actualiza con los precios cada 60 segundos
- **CoinGecko**: puede tener pequeños retrasos en criptomonedas menos populares

## 📝 Licencia

Personal project — úsalo libremente.

## 🤝 Contribuciones

Este es un proyecto personal. Si encuentras bugs o tienes sugerencias, abre un issue.

---

**Última actualización**: Junio 2026

¿Preguntas? Consulta la **Guía de Uso** dentro de la app (botón ❓)
