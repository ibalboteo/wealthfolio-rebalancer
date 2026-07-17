# Vista "Resumen" (Allocation vs Target) — Diseño

**Fecha:** 2026-07-16
**Addon:** Rebalancer (Wealthfolio)
**Estado:** Aprobado

## Contexto y problema

El addon Rebalancer muestra hoy una única vista: un grid de tarjetas
(transferencias origen→destino, posiciones desviadas y posiciones "on target").
No ofrece una lectura de conjunto del **estado actual de la cartera frente al
objetivo**. La vista oficial de Wealthfolio (`apps/frontend/src/pages/
allocation-targets/`) sí lo hace, con un donut + tabla actual-vs-objetivo +
resumen de "mayores brechas", pero trabaja a nivel de **categoría/taxonomía**.

El objetivo es dar ese contexto dentro del addon, que trabaja a nivel de **fondo
individual**, reutilizando los datos y cálculos ya presentes y aprovechando el
diferencial del addon: la simulación de la cartera **tras aplicar las
transferencias** sugeridas.

## Objetivo

Añadir una vista "Resumen" conmutable con la vista de transferencias, que muestre:

1. Un **donut** de asignación (con toggle actual/proyectado).
2. Una **tabla actual-vs-objetivo** con barra y marcador de objetivo por fondo.
3. Una tarjeta **"Mayores brechas"** con las mayores desviaciones fuera de banda.

## No objetivos (YAGNI)

- No se añade tabla de posiciones separada (redundante al trabajar por fondo).
- No se soporta agrupación por categoría/taxonomía.
- No se ejecutan transferencias ni operaciones (el addon sigue siendo read-only).
- No se añade ninguna dependencia nueva al bundle.

## Decisiones de diseño

### Navegación

- Nuevo estado `view: 'transfers' | 'overview'` en `RebalancerContent`.
- Control de **tabs** (`Transferencias | Resumen`) bajo `ApplicationHeader`,
  con los primitivos de tabs de `@wealthfolio/ui`.
- **Default = `transfers`** (mantiene el landing actual).
- El `AccountSelector` y el stepper de umbral permanecen en el header,
  compartidos por ambas vistas.
- La vista de transferencias actual se extrae a su propio subcomponente
  (`TransfersView`) sin cambios de comportamiento; nace `AllocationOverview`
  para el Resumen. Ambas consumen el mismo `useRebalance` (sin recomputar).

### Estado Actual vs Proyectado

- Toggle segmentado **"Actual · Tras rebalanceo"** encima de las tarjetas del
  Resumen.
- **Actual**: usa `holdings` con denominador `totalEnabledValue`
  (suma de `marketValue.base` de los holdings enabled).
- **Proyectado**: usa `rebalancePlan.previewHoldings` con denominador
  `rebalancePlan.totalPreviewValue` (ya simula las transferencias).
- Cuando no hay transferencias, actual == proyectado; el toggle sigue visible
  pero ambas fotos coinciden.

### Cálculos (helper puro `lib/allocation-summary.ts`)

Se extrae la fórmula de porcentaje (hoy duplicada en `rebalancer.tsx` y
`transfer-card.tsx`) a un helper puro y testeable:

- `currentPct = marketValue.base / totalValue * 100`
- `targetPct = plan.target`
- `driftPp = currentPct - targetPct`
- **Band** = `tolerancePp` (el mismo umbral del stepper existente).
  - `|driftPp| <= tolerancePp` → dentro de banda (neutro)
  - `driftPp > tolerancePp` → overweight (rojo)
  - `driftPp < -tolerancePp` → underweight (azul)
- Solo se incluyen holdings **enabled**; los deshabilitados quedan fuera del
  Resumen.
- El helper produce una lista ordenable de filas `{ id, symbol, name, currentPct,
  targetPct, driftPp, value, status }` y expone un derivado de "mayores brechas"
  (filas fuera de banda ordenadas por `|driftPp|` descendente).

### Layout del Resumen

Dos `Card` de `@wealthfolio/ui`, responsive al ancho del iframe:

- **"Asignación vs objetivo"** (tarjeta ancha):
  - Izquierda: **donut** (segmento por fondo, centro con valor total; al hover,
    nombre + % + valor del segmento).
  - Derecha: **tabla** con una fila por fondo — barra horizontal del % actual con
    **marcador vertical del objetivo**, y columnas Actual % · Objetivo % ·
    Desviación (pp).
  - Grid `xl:grid-cols-[280px_minmax(0,1fr)]`; en anchos pequeños el donut va
    arriba y la tabla debajo (patrón del componente oficial).
- **"Mayores brechas"**:
  - Top-3 fondos fuera de banda, ordenados por `|driftPp|`, con texto accionable
    (p. ej. "X está +4.0pp sobre objetivo · €Y de más") y badge de color.
  - Si hay más de 3, línea resumen con el resto.
  - Si todo está dentro de banda → "Todo dentro del objetivo. No se requiere
    ninguna acción."

### Color y consistencia

- Mapa de color estable por fondo, derivado determinísticamente del id/símbolo y
  alineado con la paleta de `TickerAvatar`, compartido entre donut y tabla para
  que segmento y fila coincidan visualmente.
- Se centraliza en `src/lib/allocation-colors.ts` (helper puro y testeable),
  reutilizado por donut y tabla.

### Interactividad

- Estado `hoveredId` compartido entre donut y tabla: hover en un segmento resalta
  su fila y viceversa.
- Centro del donut: por defecto el **valor total** de la cartera; al hover, los
  datos del segmento activo.
- Respeta `prefers-reduced-motion` (sin animación de pop-out del segmento).

### Renderizado del donut

- Se usa el primitivo **`Sector` de recharts** importado vía
  `@wealthfolio/ui/chart` (ya externalizado como host-provided en
  `vite.config.ts` → coste de bundle **cero**), replicando la técnica del donut
  oficial: SVG a mano, un `Sector` por fondo, pop-out al hover y label central.

### Estados límite

Se reutilizan los estados actuales (sin holdings, plan sin configurar, plan
corrupto), que se elevan para aplicar a ambas vistas. En el Resumen, cuando no
hay transferencias, el toggle proyectado muestra la misma foto que el actual.

## Componentes y archivos

- `src/lib/allocation-summary.ts` — helper puro de cálculo (nuevo).
- `src/lib/allocation-summary.test.ts` — tests del helper (nuevo).
- `src/components/allocation-overview.tsx` — vista Resumen (donut + tabla +
  brechas + toggle) (nuevo).
- `src/components/allocation-donut.tsx` — donut SVG con `Sector` (nuevo).
- `src/lib/allocation-colors.ts` - mapa de color estable por fondo (nuevo).
- `src/pages/rebalancer.tsx` — añadir tabs, estado `view`, extraer `TransfersView`.
- `src/components/index.ts` — exportar los nuevos componentes.

Cada unidad tiene un propósito claro: `allocation-summary` (cálculo puro),
`allocation-donut` (render del anillo), `allocation-overview` (composición/UI),
`rebalancer` (orquestación y navegación).

## Testing

- **Unitarios** (`allocation-summary.test.ts`): porcentajes, desviación,
  clasificación por band, orden de "mayores brechas", y equivalencia
  actual/proyectado según haya o no transferencias.
- **Smoke** de componentes siguiendo el patrón de tests existente
  (`addon.test.tsx`): render de `AllocationOverview` con datos de ejemplo y
  cambio de tab/toggle.

## Riesgos y mitigaciones

- **Bundle size del donut** → mitigado usando recharts host-provided
  (`@wealthfolio/ui/chart`), sin nueva dependencia.
- **Clases Tailwind arbitrarias no fiables en el bundle** (gotcha conocido del
  repo) → dimensiones críticas (anchos de barra, posición del marcador, tamaño
  del donut) con `style` inline.
- **CSS vars ya incluyen `hsl()`** → usar `var(--x)` directo, nunca
  `hsl(var(--x))`.
- **Duplicación de la fórmula de %** → se centraliza en `allocation-summary`.
