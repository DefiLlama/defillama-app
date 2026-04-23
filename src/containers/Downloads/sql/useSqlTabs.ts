import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getStorageJSON, setStorageJSON } from '~/contexts/localStorageStore'
import type { ChartConfig } from './chartConfig'
import type { PendingTable } from './TableChipRail'

const STORAGE_KEY = 'sql-studio:tabs:v1'
const PERSIST_DEBOUNCE_MS = 250
const MAX_TITLE = 40

export const DEFAULT_SQL = `-- Lending vs DEX fees — daily series with 30-day moving averages.
-- CTE + FULL OUTER JOIN stitches two time-series, then a named WINDOW
-- smooths each one. Hit ⌘/Ctrl+Enter — missing tables auto-load and
-- the Chart tab will render four lines.
WITH joined AS (
  SELECT COALESCE(l.date, d.date) AS date,
         COALESCE(l.value, 0)     AS lending,
         COALESCE(d.value, 0)     AS dexs
  FROM ts_category_fees_chart_lending l
  FULL OUTER JOIN ts_category_fees_chart_dexs d
    ON l.date = d.date
)
SELECT date,
       lending,
       dexs,
       AVG(lending) OVER w AS lending_30d_avg,
       AVG(dexs)    OVER w AS dexs_30d_avg,
       lending / NULLIF(lending + dexs, 0) AS lending_share
FROM joined
WINDOW w AS (ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW)
QUALIFY ROW_NUMBER() OVER (ORDER BY date DESC) <= 365
ORDER BY date DESC
`

const HACKS_OVER_50M_SQL = `SELECT to_timestamp(date)::TIMESTAMP::DATE AS hack_date,
       name, amount, technique, targetType, chain
FROM hacks
WHERE amount  > 50000000
ORDER BY date DESC
LIMIT 50`

function seedCell(type: NotebookCellType, source: string, extras: Partial<NotebookCell> = {}): NotebookCell {
	const cell = makeCell(type, source)
	cell.dirty = false
	return { ...cell, ...extras }
}

function welcomeNotebookCells(): NotebookCell[] {
	return [
		seedCell(
			'markdown',
			`# 🦙 Welcome to DefiLlama SQL Studio

This notebook is both an **onboarding tour** and a **mini research report**. It runs **LlamaSQL** entirely in your browser and touches every major slice of DefiLlama data: TVL, fees & revenue, stablecoins, yields, long time-series, security, and fundraising.

**Three cell types work together:**

| Type | Use it for |
|---|---|
| **SQL** | Query any dataset. \`⌘↵\` runs; \`⇧↵\` runs and advances. |
| **Chart** | Visualize a prior SQL cell without re-running it. |
| **Markdown** | Narrate your analysis (like this cell). |

Each SQL cell's output is a view named \`cell_1\`, \`cell_2\`, … Downstream cells can \`SELECT FROM cell_N\`. Missing datasets auto-load on first run. Everything auto-saves locally.

👉 **Click *Run all* in the tab header** to execute every cell top-to-bottom, or walk through manually. Nothing here is precious — edit, reorder, or delete anything. A fresh tab is always a \`⌘T\` away.`
		),
		// ──────────── Chapter 1: TVL landscape ────────────
		seedCell(
			'markdown',
			`## Chapter 1 — The TVL landscape

We start wide. \`protocols\` is a per-protocol snapshot of current TVL, market cap, primary chain, and category. A window function over empty \`OVER ()\` computes each protocol's share of *global* TVL in the same query — no subquery needed.`
		),
		seedCell(
			'sql',
			`-- Top 15 protocols by TVL, with share of the global total (single-row window).
SELECT name,
       category,
       chain,
       tvl,
       mcap,
       tvl / SUM(tvl) OVER () AS global_share
FROM protocols
WHERE tvl IS NOT NULL
ORDER BY tvl DESC
LIMIT 15`
		),
		seedCell('chart', 'cell_3', {
			chartConfig: {
				chartType: 'bar',
				xCol: 'name',
				yCols: ['tvl'],
				splitByCol: null,
				stackMode: 'off',
				rightAxisCols: [],
				seriesKinds: {},
				seriesColors: {},
				numberFormat: 'currency'
			}
		}),
		seedCell(
			'sql',
			`-- Top 15 chains by aggregate TVL, plus the biggest protocol on each.
-- arg_max(name, tvl) returns the name at the row where tvl is maximal —
-- cleaner than a window-function + QUALIFY dance.
SELECT chain,
       COUNT(*)            AS protocols,
       SUM(tvl)            AS chain_tvl,
       arg_max(name, tvl)  AS top_protocol,
       MAX(tvl)            AS top_tvl
FROM protocols
WHERE tvl IS NOT NULL AND chain IS NOT NULL
GROUP BY chain
ORDER BY chain_tvl DESC
LIMIT 15`
		),
		seedCell('chart', 'cell_5', {
			chartConfig: {
				chartType: 'hbar',
				xCol: 'chain',
				yCols: ['chain_tvl'],
				splitByCol: null,
				stackMode: 'off',
				rightAxisCols: [],
				seriesKinds: {},
				seriesColors: {},
				numberFormat: 'currency'
			}
		}),
		// ──────────── Chapter 2: Fees & revenue ────────────
		seedCell(
			'markdown',
			`## Chapter 2 — The revenue machine

TVL shows what's *parked*; \`fees\` and \`revenue\` show who's *earning*. Each table carries 24h / 7d / 30d / 1y rollups per protocol.

\`FILTER (WHERE …)\` splits an aggregate by condition without reaching for \`SUM(CASE WHEN …)\`. Below we partition each category's 30d fee total into three buckets based on 7-day momentum — a cleaner way to see which categories are expanding.`
		),
		seedCell(
			'sql',
			`-- Category fee breakdown with FILTER (WHERE) splitting by 7-day momentum.
-- TRY_CAST guards against columns that CSV inference landed as VARCHAR.
SELECT category,
       COUNT(*)                                                                             AS protocols,
       SUM(TRY_CAST(total30d AS DOUBLE))                                                    AS fees_30d,
       SUM(TRY_CAST(total30d AS DOUBLE)) FILTER (WHERE change_7d > 0)                       AS fees_growing,
       SUM(TRY_CAST(total30d AS DOUBLE)) FILTER (WHERE change_7d < 0)                       AS fees_declining,
       SUM(TRY_CAST(total30d AS DOUBLE)) FILTER (WHERE change_7d IS NULL OR change_7d = 0)  AS fees_flat
FROM fees
WHERE TRY_CAST(total30d AS DOUBLE) > 0 AND category IS NOT NULL
GROUP BY category
ORDER BY fees_30d DESC
LIMIT 12`
		),
		seedCell('chart', 'cell_8', {
			chartConfig: {
				chartType: 'pie',
				xCol: 'category',
				yCols: ['fees_30d'],
				splitByCol: null,
				stackMode: 'off',
				rightAxisCols: [],
				seriesKinds: {},
				seriesColors: {},
				numberFormat: 'currency'
			}
		}),
		seedCell(
			'sql',
			`-- Take rate = revenue kept ÷ fees generated. LEFT JOIN so a protocol with
-- revenue but no fee feed still appears. NULLIF avoids divide-by-zero.
WITH r AS (
  SELECT name, category, chains,
         TRY_CAST(total30d AS DOUBLE) AS revenue_30d,
         change_30dover30d
  FROM revenue
),
f AS (
  SELECT name, TRY_CAST(total30d AS DOUBLE) AS fees_30d FROM fees
)
SELECT r.name,
       r.category,
       r.chains,
       r.revenue_30d,
       f.fees_30d,
       r.revenue_30d / NULLIF(f.fees_30d, 0) AS take_rate,
       r.change_30dover30d                    AS revenue_mom_pct
FROM r
LEFT JOIN f ON f.name = r.name
WHERE r.revenue_30d > 0
ORDER BY r.revenue_30d DESC
LIMIT 15`
		),
		// ──────────── Chapter 3: Time series ────────────
		seedCell(
			'markdown',
			`## Chapter 3 — Time series: DEXs vs Lending

Time-series tables follow \`ts_<chart>_<param>\`. We pull the fee histories for two categories — \`dexs\` and \`lending\` — stitch them on date with \`FULL OUTER JOIN\` so gaps don't break the alignment, then smooth each line with a 30-day rolling window (\`ROWS BETWEEN 29 PRECEDING AND CURRENT ROW\`).

\`QUALIFY\` filters on the window result without a wrapping subquery — a LlamaSQL convenience.`
		),
		seedCell(
			'sql',
			`-- CTE joins the two series; a named WINDOW smooths each.
WITH joined AS (
  SELECT COALESCE(l.date, d.date) AS date,
         COALESCE(l.value, 0)     AS lending,
         COALESCE(d.value, 0)     AS dexs
  FROM ts_category_fees_chart_lending l
  FULL OUTER JOIN ts_category_fees_chart_dexs d
    ON l.date = d.date
)
SELECT date,
       lending,
       dexs,
       AVG(lending) OVER w AS lending_30d,
       AVG(dexs)    OVER w AS dexs_30d,
       dexs - lending      AS gap
FROM joined
WINDOW w AS (ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW)
QUALIFY ROW_NUMBER() OVER (ORDER BY date DESC) <= 540
ORDER BY date`
		),
		seedCell('chart', 'cell_12', {
			chartConfig: {
				chartType: 'line',
				xCol: 'date',
				yCols: ['lending_30d', 'dexs_30d'],
				splitByCol: null,
				stackMode: 'off',
				rightAxisCols: [],
				seriesKinds: {},
				seriesColors: {},
				numberFormat: 'currency'
			}
		}),
		seedCell(
			'sql',
			`-- Downstream cell: reads cell_12's view and ranks days by DEX/Lending ratio.
-- Ratio avoids scale bias — absolute gap would favor elevated-level days.
SELECT date,
       dexs_30d,
       lending_30d,
       dexs_30d / NULLIF(lending_30d, 0) AS ratio,
       dexs_30d - lending_30d             AS gap
FROM cell_12
WHERE dexs_30d IS NOT NULL AND lending_30d > 0
ORDER BY ratio DESC
LIMIT 15`
		),
		// ──────────── Chapter 4: Stablecoins ────────────
		seedCell(
			'markdown',
			`## Chapter 4 — Stablecoins: who's growing?

The \`stablecoins\` table has one quirk worth calling out: every \`circulating*\` column is a **JSON object keyed by pegType** (e.g. \`{"peggedUSD": 188672214542}\`) — not a plain number. To extract a value we use \`json_extract(col, '$.peggedUSD')\` and cast to \`DOUBLE\`.

A **CTE** up front pulls all four time points (now / prev day / prev week / prev month) in one pass so the main query stays readable. We then rank USD-pegged stablecoins above $100M by their **30-day net issuance** — the clearest signal of who's gaining share — alongside the percent growth for 7d and 30d windows.`
		),
		seedCell(
			'sql',
			`-- 30-day issuance leaders among USD stablecoins (>$100M circulating).
-- Every circulating* column is a JSON object; pull peggedUSD once via CTE.
WITH s AS (
  SELECT name, symbol, pegMechanism,
         CAST(json_extract(circulating,          '$.peggedUSD') AS DOUBLE) AS now,
         CAST(json_extract(circulatingPrevWeek,  '$.peggedUSD') AS DOUBLE) AS week_ago,
         CAST(json_extract(circulatingPrevMonth, '$.peggedUSD') AS DOUBLE) AS month_ago
  FROM stablecoins
  WHERE pegType = 'peggedUSD'
)
SELECT name,
       symbol,
       pegMechanism,
       now                                              AS circulating_usd,
       now - month_ago                                  AS net_change_30d,
       (now - month_ago) / NULLIF(month_ago, 0) * 100   AS growth_30d_pct,
       (now - week_ago)  / NULLIF(week_ago, 0)  * 100   AS growth_7d_pct
FROM s
WHERE now > 100000000
ORDER BY net_change_30d DESC NULLS LAST
LIMIT 15`
		),
		seedCell('chart', 'cell_16', {
			chartConfig: {
				chartType: 'bar',
				xCol: 'name',
				yCols: ['net_change_30d'],
				splitByCol: null,
				stackMode: 'off',
				rightAxisCols: [],
				seriesKinds: {},
				seriesColors: {},
				numberFormat: 'currency'
			}
		}),
		// ──────────── Chapter 5: Yields ────────────
		seedCell(
			'markdown',
			`## Chapter 5 — Yield markets: where's the tail?

A median APY tells you what a typical pool earns. The 90th and 99th percentiles tell you how long the risky tail gets. \`approx_quantile\` is LlamaSQL's fast approximate percentile — deterministic within a single query. We clamp at 1000% to drop obvious outliers (expired incentives, calculation blips) and require at least 10 pools per chain to cut noise.`
		),
		seedCell(
			'sql',
			`-- Yield distribution per chain: median, 90th, 99th percentile APY.
SELECT chain,
       COUNT(*)                            AS pools,
       SUM(TRY_CAST(tvlUsd AS DOUBLE))     AS total_tvl,
       approx_quantile(apy, 0.50)          AS median_apy,
       approx_quantile(apy, 0.90)          AS p90_apy,
       approx_quantile(apy, 0.99)          AS p99_apy
FROM yields
WHERE apy IS NOT NULL AND apy BETWEEN 0 AND 1000 AND chain IS NOT NULL
GROUP BY chain
HAVING COUNT(*) >= 10
ORDER BY pools DESC
LIMIT 15`
		),
		seedCell('chart', 'cell_19', {
			chartConfig: {
				chartType: 'bar',
				xCol: 'chain',
				yCols: ['median_apy', 'p90_apy'],
				splitByCol: null,
				stackMode: 'off',
				rightAxisCols: [],
				seriesKinds: {},
				seriesColors: {},
				numberFormat: 'percent'
			}
		}),
		// ──────────── Chapter 6: ETH historical ────────────
		seedCell(
			'markdown',
			`## Chapter 6 — Ethereum through the cycles

Chain-TVL charts are an exception to the \`(date, value)\` default: the top-level column is \`tvl\`, and the shape grows with per-chain buckets (liquid staking, treasury, etc.). We pull ~3 years of the main \`tvl\` series, smooth with a 30-day rolling average, and tag each row by calendar year so downstream cells can group by cycle.`
		),
		seedCell(
			'sql',
			`-- Ethereum TVL with 30-day moving average, last ~3 years, year-tagged.
SELECT date,
       tvl,
       AVG(tvl) OVER w      AS tvl_30d_avg,
       strftime(date, '%Y') AS year
FROM ts_chain_tvl_chart_ethereum
WHERE tvl IS NOT NULL
WINDOW w AS (ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW)
QUALIFY ROW_NUMBER() OVER (ORDER BY date DESC) <= 1100
ORDER BY date`
		),
		seedCell('chart', 'cell_22', {
			chartConfig: {
				chartType: 'area',
				xCol: 'date',
				yCols: ['tvl_30d_avg'],
				splitByCol: null,
				stackMode: 'off',
				rightAxisCols: [],
				seriesKinds: {},
				seriesColors: {},
				numberFormat: 'currency'
			}
		}),
		// ──────────── Chapter 7: Hacks ────────────
		seedCell(
			'markdown',
			`## Chapter 7 — Security: hacks by year

Flat tables like \`hacks\` and \`raises\` store \`date\` as **BIGINT unix seconds** — *always* wrap with \`to_timestamp(date)\` before any date function. The \`::TIMESTAMP::DATE\` cast chain strips the timezone layer and truncates to a calendar date so downstream charts get a clean x-axis.

Here we bucket incidents by year with \`date_trunc\`, use \`FILTER (WHERE)\` to separate nine-figure events from the long tail, and surface the single biggest incident per year with \`arg_max\`.`
		),
		seedCell(
			'sql',
			`-- Yearly hacks: totals, counts, and biggest-single-incident per year.
-- A CTE upfront coerces amount to DOUBLE once so downstream aggregates stay readable.
WITH h AS (
  SELECT date, name,
         TRY_CAST(amount AS DOUBLE) AS amount
  FROM hacks
  WHERE date IS NOT NULL
)
SELECT date_trunc('year', to_timestamp(date)::TIMESTAMP)::DATE AS year,
       COUNT(*)                                              AS incidents,
       SUM(amount)                                           AS total_lost,
       COUNT(*)    FILTER (WHERE amount >= 100000000)        AS big_hack_count,
       SUM(amount) FILTER (WHERE amount >= 100000000)        AS big_hack_losses,
       arg_max(name, amount)                                 AS biggest_incident,
       MAX(amount)                                           AS biggest_amount
FROM h
WHERE amount > 0
GROUP BY year
ORDER BY year`
		),
		seedCell('chart', 'cell_25', {
			chartConfig: {
				chartType: 'bar',
				xCol: 'year',
				yCols: ['total_lost', 'incidents'],
				splitByCol: null,
				stackMode: 'off',
				rightAxisCols: ['incidents'],
				seriesKinds: {},
				seriesColors: {},
				numberFormat: 'currency'
			}
		}),
		// ──────────── Closing ────────────
		seedCell(
			'markdown',
			`## That's the tour

In ~27 cells we exercised **7 datasets** (\`protocols\`, \`fees\`, \`revenue\`, \`stablecoins\`, \`yields\`, \`hacks\`, \`ts_chain_tvl_chart_ethereum\`, \`ts_category_fees_chart_*\`) and a handful of LlamaSQL moves worth remembering:

- **\`FILTER (WHERE …)\`** — conditional aggregates without \`CASE WHEN\`
- **\`UNNEST(string_split(…, ','))\`** — comma-list VARCHARs → rows
- **\`approx_quantile\`** / **\`arg_max\`** — distributions & pick-at-extremum
- **\`FULL OUTER JOIN\`** + **\`COALESCE\`** — align mismatched time-series
- **Named \`WINDOW\`** with \`ROWS BETWEEN N PRECEDING AND CURRENT ROW\` — rolling aggregates
- **\`QUALIFY\`** — filter a window result without a subquery
- **\`TRY_CAST(x AS DOUBLE)\`** — defensive math for CSV-inferred VARCHAR columns
- **\`to_timestamp\`** / **\`date_trunc\`** / **\`strftime\`** — unix seconds → usable dates

More in the **Docs** panel: \`ASOF JOIN\` (nearest-prior temporal match), \`PIVOT\` (long → wide), and the full cookbook.

### Where to go next

- **Schema drawer** (left rail) — every dataset, every column, with exact names to copy
- **Docs panel** — cookbook snippets and keyboard shortcuts
- **Copy for AI** — dumps a schema + dialect reference you can paste into ChatGPT / Claude for query help
- **Share** — a URL that reproduces this entire notebook (cells + charts)
- **\`⌘T\`** opens a fresh query tab; the \`+\` menu has **New notebook tab**

Delete this notebook whenever you're ready — a new one is always one click away.`
		)
	]
}

export interface QueryResult {
	columns: Array<{ name: string; type: string }>
	rows: Record<string, unknown>[]
}

export interface LastRunMeta {
	durationMs: number
	rows: number
	cols: number
	at: number
}

export type TabMode = 'query' | 'notebook'
export type NotebookCellType = 'sql' | 'markdown' | 'chart'
export type ResultsView = 'table' | 'chart'

export interface NotebookCell {
	id: string
	type: NotebookCellType
	source: string
	chartConfig?: ChartConfig
	preferredView?: ResultsView
	result: QueryResult | null
	running: boolean
	runError: string | null
	lastRun: LastRunMeta | null
	loadingStage: string | null
	pendingTables: PendingTable[]
	dirty: boolean
}

export interface QueryTab {
	id: string
	title: string
	titleAuto: boolean
	sql: string
	result: QueryResult | null
	running: boolean
	runError: string | null
	lastRun: LastRunMeta | null
	loadingStage: string | null
	busyTaskId: string | null
	pendingTables: PendingTable[]
	dirty: boolean
	chartConfig?: ChartConfig
	mode: TabMode
	cells?: NotebookCell[]
	activeCellId?: string
	cellsDirty?: boolean
}

type PersistedCell = Pick<NotebookCell, 'id' | 'type' | 'source' | 'chartConfig' | 'preferredView'>
type PersistedTab = Pick<QueryTab, 'id' | 'title' | 'titleAuto' | 'sql' | 'chartConfig'> & {
	mode?: TabMode
	cells?: PersistedCell[]
	activeCellId?: string
}
interface PersistedState {
	tabs: PersistedTab[]
	activeTabId: string
}

interface TabsState {
	tabs: QueryTab[]
	activeTabId: string
}

export function deriveTitle(sql: string): string {
	const line =
		sql
			.split('\n')
			.find((l) => l.trim())
			?.trim() ?? ''
	return line.slice(0, MAX_TITLE) || 'Untitled'
}

function createId() {
	return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function blankTab(sql = ''): QueryTab {
	return {
		id: createId(),
		title: deriveTitle(sql),
		titleAuto: true,
		sql,
		result: null,
		running: false,
		runError: null,
		lastRun: null,
		loadingStage: null,
		busyTaskId: null,
		pendingTables: [],
		dirty: sql.length > 0,
		chartConfig: undefined,
		mode: 'query'
	}
}

function makeCell(type: NotebookCellType, source = ''): NotebookCell {
	return {
		id: createId(),
		type,
		source,
		chartConfig: undefined,
		preferredView: undefined,
		result: null,
		running: false,
		runError: null,
		lastRun: null,
		loadingStage: null,
		pendingTables: [],
		dirty: source.length > 0
	}
}

function blankNotebookTab(initialCells?: NotebookCell[], title = 'Untitled notebook'): QueryTab {
	const cells = initialCells && initialCells.length > 0 ? initialCells : [makeCell('sql', '')]
	return {
		id: createId(),
		title: title.slice(0, MAX_TITLE),
		titleAuto: false,
		sql: '',
		result: null,
		running: false,
		runError: null,
		lastRun: null,
		loadingStage: null,
		busyTaskId: null,
		pendingTables: [],
		dirty: false,
		chartConfig: undefined,
		mode: 'notebook',
		cells,
		activeCellId: cells[0].id
	}
}

function seedDefaultTabs(): QueryTab[] {
	const welcome = blankNotebookTab(welcomeNotebookCells(), 'Welcome')
	const hacks = { ...blankTab(HACKS_OVER_50M_SQL), title: 'Hacks over $50M', titleAuto: false }
	return [welcome, hacks]
}

function hydrateCell(p: PersistedCell): NotebookCell | null {
	if (!p || typeof p.id !== 'string' || typeof p.source !== 'string') return null
	const type: NotebookCellType = p.type === 'markdown' ? 'markdown' : p.type === 'chart' ? 'chart' : 'sql'
	return {
		id: p.id,
		type,
		source: p.source,
		chartConfig: p.chartConfig,
		preferredView: p.preferredView,
		result: null,
		running: false,
		runError: null,
		lastRun: null,
		loadingStage: null,
		pendingTables: [],
		dirty: false
	}
}

function hydrate(): TabsState {
	const persisted = getStorageJSON<PersistedState | null>(STORAGE_KEY, null)
	if (!persisted || !Array.isArray(persisted.tabs) || persisted.tabs.length === 0) {
		const seeded = seedDefaultTabs()
		return { tabs: seeded, activeTabId: seeded[0].id }
	}
	const tabs: QueryTab[] = persisted.tabs
		.filter((p) => p && typeof p.id === 'string' && typeof p.sql === 'string')
		.map((p) => {
			const mode: TabMode = p.mode === 'notebook' ? 'notebook' : 'query'
			const cellsRaw =
				mode === 'notebook' && Array.isArray(p.cells)
					? (p.cells.map(hydrateCell).filter((c): c is NotebookCell => c !== null) as NotebookCell[])
					: undefined
			const cells = cellsRaw && cellsRaw.length > 0 ? cellsRaw : mode === 'notebook' ? [makeCell('sql', '')] : undefined
			const activeCellId =
				mode === 'notebook' && cells
					? cells.some((c) => c.id === p.activeCellId)
						? p.activeCellId
						: cells[0].id
					: undefined
			return {
				id: p.id,
				title: typeof p.title === 'string' ? p.title : deriveTitle(p.sql),
				titleAuto: p.titleAuto !== false,
				sql: p.sql,
				result: null,
				running: false,
				runError: null,
				lastRun: null,
				loadingStage: null,
				busyTaskId: null,
				pendingTables: [],
				dirty: false,
				chartConfig: p.chartConfig,
				mode,
				cells,
				activeCellId
			}
		})
	if (tabs.length === 0) {
		const seeded = seedDefaultTabs()
		return { tabs: seeded, activeTabId: seeded[0].id }
	}
	const activeTabId = tabs.some((t) => t.id === persisted.activeTabId) ? persisted.activeTabId : tabs[0].id
	return { tabs, activeTabId }
}

export interface OpenTabOptions {
	sql?: string
	title?: string
	focus?: boolean
}

export interface OpenNotebookTabOptions {
	cells?: NotebookCell[]
	title?: string
	focus?: boolean
}

export interface UseSqlTabsReturn {
	tabs: QueryTab[]
	activeTabId: string
	activeTab: QueryTab
	openTab: (options?: OpenTabOptions) => string
	openNotebookTab: (options?: OpenNotebookTabOptions) => string
	openOrFocusBySql: (sql: string, title?: string) => string
	closeTab: (id: string) => void
	focusTab: (id: string) => void
	focusByIndex: (index: number) => void
	focusDelta: (delta: number) => void
	duplicateTab: (id: string) => void
	closeOthers: (id: string) => void
	closeToRight: (id: string) => void
	renameTab: (id: string, title: string) => void
	updateTab: (id: string, patch: Partial<QueryTab> | ((t: QueryTab) => Partial<QueryTab>)) => void
	updateActiveTab: (patch: Partial<QueryTab> | ((t: QueryTab) => Partial<QueryTab>)) => void
	setActiveSql: (next: string) => void
	setActiveChartConfig: (next: ChartConfig | null) => void
	convertTabToNotebook: (id: string) => void
	updateCell: (
		tabId: string,
		cellId: string,
		patch: Partial<NotebookCell> | ((c: NotebookCell) => Partial<NotebookCell>)
	) => void
	addCell: (tabId: string, type: NotebookCellType, atIndex?: number | null, focus?: boolean) => string | null
	removeCell: (tabId: string, cellId: string) => void
	reorderCells: (tabId: string, fromIdx: number, toIdx: number) => void
	focusCell: (tabId: string, cellId: string) => void
	setCellsDirty: (tabId: string, value: boolean) => void
}

export function useSqlTabs(): UseSqlTabsReturn {
	const [state, setState] = useState<TabsState>(hydrate)

	const persistTimer = useRef<number | null>(null)
	useEffect(() => {
		if (persistTimer.current) window.clearTimeout(persistTimer.current)
		persistTimer.current = window.setTimeout(() => {
			const payload: PersistedState = {
				tabs: state.tabs.map(({ id, title, titleAuto, sql, chartConfig, mode, cells, activeCellId }) => ({
					id,
					title,
					titleAuto,
					sql,
					chartConfig,
					mode,
					cells: cells?.map((c) => ({
						id: c.id,
						type: c.type,
						source: c.source,
						chartConfig: c.chartConfig,
						preferredView: c.preferredView
					})),
					activeCellId
				})),
				activeTabId: state.activeTabId
			}
			setStorageJSON(STORAGE_KEY, payload)
		}, PERSIST_DEBOUNCE_MS)
		return () => {
			if (persistTimer.current) window.clearTimeout(persistTimer.current)
		}
	}, [state])

	const activeTab = useMemo(() => state.tabs.find((t) => t.id === state.activeTabId) ?? state.tabs[0], [state])

	const updateTab = useCallback((id: string, patch: Partial<QueryTab> | ((t: QueryTab) => Partial<QueryTab>)) => {
		setState((prev) => {
			const idx = prev.tabs.findIndex((t) => t.id === id)
			if (idx === -1) return prev
			const current = prev.tabs[idx]
			const resolved = typeof patch === 'function' ? patch(current) : patch
			const merged: QueryTab = { ...current, ...resolved }
			if (merged.titleAuto && resolved.sql !== undefined && merged.mode === 'query') {
				merged.title = deriveTitle(merged.sql)
			}
			const nextTabs = prev.tabs.slice()
			nextTabs[idx] = merged
			return { ...prev, tabs: nextTabs }
		})
	}, [])

	const updateActiveTab = useCallback((patch: Partial<QueryTab> | ((t: QueryTab) => Partial<QueryTab>)) => {
		setState((prev) => {
			const idx = prev.tabs.findIndex((t) => t.id === prev.activeTabId)
			if (idx === -1) return prev
			const current = prev.tabs[idx]
			const resolved = typeof patch === 'function' ? patch(current) : patch
			const merged: QueryTab = { ...current, ...resolved }
			if (merged.titleAuto && resolved.sql !== undefined && merged.mode === 'query') {
				merged.title = deriveTitle(merged.sql)
			}
			const nextTabs = prev.tabs.slice()
			nextTabs[idx] = merged
			return { ...prev, tabs: nextTabs }
		})
	}, [])

	const setActiveSql = useCallback(
		(next: string) => {
			updateActiveTab((t) => ({ sql: next, dirty: next !== t.sql ? true : t.dirty }))
		},
		[updateActiveTab]
	)

	const setActiveChartConfig = useCallback(
		(next: ChartConfig | null) => {
			updateActiveTab({ chartConfig: next ?? undefined })
		},
		[updateActiveTab]
	)

	const openTab = useCallback((options: OpenTabOptions = {}) => {
		const sql = options.sql ?? ''
		const nextTab: QueryTab = {
			...blankTab(sql),
			title: options.title ? options.title.slice(0, MAX_TITLE) : deriveTitle(sql),
			titleAuto: !options.title
		}
		setState((prev) => ({
			tabs: [...prev.tabs, nextTab],
			activeTabId: options.focus === false ? prev.activeTabId : nextTab.id
		}))
		return nextTab.id
	}, [])

	const openNotebookTab = useCallback((options: OpenNotebookTabOptions = {}) => {
		const nextTab = blankNotebookTab(options.cells, options.title ?? 'Untitled notebook')
		setState((prev) => ({
			tabs: [...prev.tabs, nextTab],
			activeTabId: options.focus === false ? prev.activeTabId : nextTab.id
		}))
		return nextTab.id
	}, [])

	const openOrFocusBySql = useCallback((sql: string, title?: string) => {
		let foundId: string | null = null
		setState((prev) => {
			const existing = prev.tabs.find((t) => t.mode === 'query' && t.sql === sql)
			if (existing) {
				foundId = existing.id
				return { ...prev, activeTabId: existing.id }
			}
			const nextTab: QueryTab = {
				...blankTab(sql),
				title: title ? title.slice(0, MAX_TITLE) : deriveTitle(sql),
				titleAuto: !title
			}
			foundId = nextTab.id
			return { tabs: [...prev.tabs, nextTab], activeTabId: nextTab.id }
		})
		return foundId as unknown as string
	}, [])

	const closeTab = useCallback((id: string) => {
		setState((prev) => {
			const idx = prev.tabs.findIndex((t) => t.id === id)
			if (idx === -1) return prev
			const nextTabs = prev.tabs.filter((t) => t.id !== id)
			if (nextTabs.length === 0) {
				const fresh = blankTab('')
				return { tabs: [fresh], activeTabId: fresh.id }
			}
			let activeTabId = prev.activeTabId
			if (prev.activeTabId === id) {
				const neighbor = nextTabs[idx] ?? nextTabs[idx - 1] ?? nextTabs[0]
				activeTabId = neighbor.id
			}
			return { tabs: nextTabs, activeTabId }
		})
	}, [])

	const focusTab = useCallback((id: string) => {
		setState((prev) => (prev.activeTabId === id ? prev : { ...prev, activeTabId: id }))
	}, [])

	const focusByIndex = useCallback((index: number) => {
		setState((prev) => {
			const clamped = Math.max(0, Math.min(index, prev.tabs.length - 1))
			const next = prev.tabs[clamped]
			if (!next || next.id === prev.activeTabId) return prev
			return { ...prev, activeTabId: next.id }
		})
	}, [])

	const focusDelta = useCallback((delta: number) => {
		setState((prev) => {
			if (prev.tabs.length <= 1) return prev
			const currentIdx = prev.tabs.findIndex((t) => t.id === prev.activeTabId)
			if (currentIdx === -1) return prev
			const n = prev.tabs.length
			const nextIdx = (((currentIdx + delta) % n) + n) % n
			return { ...prev, activeTabId: prev.tabs[nextIdx].id }
		})
	}, [])

	const duplicateTab = useCallback((id: string) => {
		setState((prev) => {
			const src = prev.tabs.find((t) => t.id === id)
			if (!src) return prev
			let copy: QueryTab
			if (src.mode === 'notebook' && src.cells) {
				const dupCells = src.cells.map((c) => ({ ...makeCell(c.type, c.source), chartConfig: c.chartConfig }))
				copy = blankNotebookTab(dupCells, src.title)
			} else {
				copy = {
					...blankTab(src.sql),
					title: src.title,
					titleAuto: src.titleAuto
				}
			}
			const idx = prev.tabs.findIndex((t) => t.id === id)
			const nextTabs = prev.tabs.slice()
			nextTabs.splice(idx + 1, 0, copy)
			return { tabs: nextTabs, activeTabId: copy.id }
		})
	}, [])

	const closeOthers = useCallback((id: string) => {
		setState((prev) => {
			const keep = prev.tabs.find((t) => t.id === id)
			if (!keep) return prev
			return { tabs: [keep], activeTabId: keep.id }
		})
	}, [])

	const closeToRight = useCallback((id: string) => {
		setState((prev) => {
			const idx = prev.tabs.findIndex((t) => t.id === id)
			if (idx === -1) return prev
			const nextTabs = prev.tabs.slice(0, idx + 1)
			const activeTabId = nextTabs.some((t) => t.id === prev.activeTabId) ? prev.activeTabId : nextTabs[idx].id
			return { ...prev, tabs: nextTabs, activeTabId }
		})
	}, [])

	const renameTab = useCallback((id: string, title: string) => {
		const trimmed = title.trim().slice(0, MAX_TITLE)
		setState((prev) => {
			const idx = prev.tabs.findIndex((t) => t.id === id)
			if (idx === -1) return prev
			const current = prev.tabs[idx]
			const nextTitle = trimmed || (current.mode === 'notebook' ? 'Untitled notebook' : deriveTitle(current.sql))
			const titleAuto = current.mode === 'query' && trimmed.length === 0
			const nextTabs = prev.tabs.slice()
			nextTabs[idx] = { ...current, title: nextTitle, titleAuto }
			return { ...prev, tabs: nextTabs }
		})
	}, [])

	const convertTabToNotebook = useCallback((id: string) => {
		setState((prev) => {
			const idx = prev.tabs.findIndex((t) => t.id === id)
			if (idx === -1) return prev
			const current = prev.tabs[idx]
			if (current.mode === 'notebook') return prev
			const firstCell: NotebookCell = {
				...makeCell('sql', current.sql),
				chartConfig: current.chartConfig,
				dirty: current.sql.trim().length > 0
			}
			const nextTab: QueryTab = {
				...current,
				mode: 'notebook',
				cells: [firstCell],
				activeCellId: firstCell.id,
				title: current.titleAuto ? 'Untitled notebook' : current.title,
				titleAuto: false
			}
			const nextTabs = prev.tabs.slice()
			nextTabs[idx] = nextTab
			return { ...prev, tabs: nextTabs }
		})
	}, [])

	const updateCell = useCallback(
		(tabId: string, cellId: string, patch: Partial<NotebookCell> | ((c: NotebookCell) => Partial<NotebookCell>)) => {
			setState((prev) => {
				const idx = prev.tabs.findIndex((t) => t.id === tabId)
				if (idx === -1) return prev
				const tab = prev.tabs[idx]
				if (tab.mode !== 'notebook' || !tab.cells) return prev
				const cellIdx = tab.cells.findIndex((c) => c.id === cellId)
				if (cellIdx === -1) return prev
				const current = tab.cells[cellIdx]
				const resolved = typeof patch === 'function' ? patch(current) : patch
				const merged: NotebookCell = { ...current, ...resolved }
				const nextCells = tab.cells.slice()
				nextCells[cellIdx] = merged
				const nextTabs = prev.tabs.slice()
				nextTabs[idx] = { ...tab, cells: nextCells }
				return { ...prev, tabs: nextTabs }
			})
		},
		[]
	)

	const addCell = useCallback((tabId: string, type: NotebookCellType, atIndex?: number | null, focus = true) => {
		let newId: string | null = null
		setState((prev) => {
			const idx = prev.tabs.findIndex((t) => t.id === tabId)
			if (idx === -1) return prev
			const tab = prev.tabs[idx]
			if (tab.mode !== 'notebook' || !tab.cells) return prev
			const newCell = makeCell(type, '')
			newId = newCell.id
			const nextCells = tab.cells.slice()
			const insertAt =
				atIndex === null || atIndex === undefined ? nextCells.length : Math.max(0, Math.min(atIndex, nextCells.length))
			nextCells.splice(insertAt, 0, newCell)
			const nextTabs = prev.tabs.slice()
			nextTabs[idx] = {
				...tab,
				cells: nextCells,
				activeCellId: focus ? newCell.id : tab.activeCellId,
				cellsDirty: tab.cells.length > 0
			}
			return { ...prev, tabs: nextTabs }
		})
		return newId
	}, [])

	const removeCell = useCallback((tabId: string, cellId: string) => {
		setState((prev) => {
			const idx = prev.tabs.findIndex((t) => t.id === tabId)
			if (idx === -1) return prev
			const tab = prev.tabs[idx]
			if (tab.mode !== 'notebook' || !tab.cells) return prev
			if (tab.cells.length <= 1) {
				const fresh = makeCell('sql', '')
				const nextTabs = prev.tabs.slice()
				nextTabs[idx] = { ...tab, cells: [fresh], activeCellId: fresh.id, cellsDirty: true }
				return { ...prev, tabs: nextTabs }
			}
			const removeIdx = tab.cells.findIndex((c) => c.id === cellId)
			if (removeIdx === -1) return prev
			const nextCells = tab.cells.filter((c) => c.id !== cellId)
			let nextActiveCellId = tab.activeCellId
			if (tab.activeCellId === cellId) {
				const neighbor = nextCells[removeIdx] ?? nextCells[removeIdx - 1] ?? nextCells[0]
				nextActiveCellId = neighbor.id
			}
			const nextTabs = prev.tabs.slice()
			nextTabs[idx] = { ...tab, cells: nextCells, activeCellId: nextActiveCellId, cellsDirty: true }
			return { ...prev, tabs: nextTabs }
		})
	}, [])

	const reorderCells = useCallback((tabId: string, fromIdx: number, toIdx: number) => {
		setState((prev) => {
			const idx = prev.tabs.findIndex((t) => t.id === tabId)
			if (idx === -1) return prev
			const tab = prev.tabs[idx]
			if (tab.mode !== 'notebook' || !tab.cells) return prev
			if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= tab.cells.length || toIdx >= tab.cells.length) {
				return prev
			}
			const nextCells = tab.cells.slice()
			const [moved] = nextCells.splice(fromIdx, 1)
			nextCells.splice(toIdx, 0, moved)
			const nextTabs = prev.tabs.slice()
			nextTabs[idx] = { ...tab, cells: nextCells, cellsDirty: true }
			return { ...prev, tabs: nextTabs }
		})
	}, [])

	const focusCell = useCallback((tabId: string, cellId: string) => {
		setState((prev) => {
			const idx = prev.tabs.findIndex((t) => t.id === tabId)
			if (idx === -1) return prev
			const tab = prev.tabs[idx]
			if (tab.mode !== 'notebook' || !tab.cells) return prev
			if (tab.activeCellId === cellId) return prev
			if (!tab.cells.some((c) => c.id === cellId)) return prev
			const nextTabs = prev.tabs.slice()
			nextTabs[idx] = { ...tab, activeCellId: cellId }
			return { ...prev, tabs: nextTabs }
		})
	}, [])

	const setCellsDirty = useCallback((tabId: string, value: boolean) => {
		setState((prev) => {
			const idx = prev.tabs.findIndex((t) => t.id === tabId)
			if (idx === -1) return prev
			const tab = prev.tabs[idx]
			if (tab.cellsDirty === value) return prev
			const nextTabs = prev.tabs.slice()
			nextTabs[idx] = { ...tab, cellsDirty: value }
			return { ...prev, tabs: nextTabs }
		})
	}, [])

	return {
		tabs: state.tabs,
		activeTabId: state.activeTabId,
		activeTab,
		openTab,
		openNotebookTab,
		openOrFocusBySql,
		closeTab,
		focusTab,
		focusByIndex,
		focusDelta,
		duplicateTab,
		closeOthers,
		closeToRight,
		renameTab,
		updateTab,
		updateActiveTab,
		setActiveSql,
		setActiveChartConfig,
		convertTabToNotebook,
		updateCell,
		addCell,
		removeCell,
		reorderCells,
		focusCell,
		setCellsDirty
	}
}
