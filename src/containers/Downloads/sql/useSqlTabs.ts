import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getStorageJSON, setStorageJSON } from '~/contexts/localStorageStore'
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
}

type PersistedTab = Pick<QueryTab, 'id' | 'title' | 'titleAuto' | 'sql'>
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
		dirty: sql.length > 0
	}
}

function seedDefaultTabs(): QueryTab[] {
	return [blankTab(DEFAULT_SQL), { ...blankTab(HACKS_OVER_50M_SQL), title: 'Hacks over $50M', titleAuto: false }]
}

function hydrate(): TabsState {
	const persisted = getStorageJSON<PersistedState | null>(STORAGE_KEY, null)
	if (!persisted || !Array.isArray(persisted.tabs) || persisted.tabs.length === 0) {
		const seeded = seedDefaultTabs()
		return { tabs: seeded, activeTabId: seeded[0].id }
	}
	const tabs: QueryTab[] = persisted.tabs
		.filter((p) => p && typeof p.id === 'string' && typeof p.sql === 'string')
		.map((p) => ({
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
			dirty: false
		}))
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

export interface UseSqlTabsReturn {
	tabs: QueryTab[]
	activeTabId: string
	activeTab: QueryTab
	openTab: (options?: OpenTabOptions) => string
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
}

export function useSqlTabs(): UseSqlTabsReturn {
	const [state, setState] = useState<TabsState>(hydrate)

	const persistTimer = useRef<number | null>(null)
	useEffect(() => {
		if (persistTimer.current) window.clearTimeout(persistTimer.current)
		persistTimer.current = window.setTimeout(() => {
			const payload: PersistedState = {
				tabs: state.tabs.map(({ id, title, titleAuto, sql }) => ({ id, title, titleAuto, sql })),
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
			if (merged.titleAuto && resolved.sql !== undefined) {
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
			if (merged.titleAuto && resolved.sql !== undefined) {
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

	const openOrFocusBySql = useCallback((sql: string, title?: string) => {
		let foundId: string | null = null
		setState((prev) => {
			const existing = prev.tabs.find((t) => t.sql === sql)
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
			const copy: QueryTab = {
				...blankTab(src.sql),
				title: src.title,
				titleAuto: src.titleAuto
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
			return { tabs: nextTabs, activeTabId }
		})
	}, [])

	const renameTab = useCallback((id: string, title: string) => {
		const trimmed = title.trim().slice(0, MAX_TITLE)
		setState((prev) => {
			const idx = prev.tabs.findIndex((t) => t.id === id)
			if (idx === -1) return prev
			const current = prev.tabs[idx]
			const nextTitle = trimmed || deriveTitle(current.sql)
			const titleAuto = trimmed.length === 0
			const nextTabs = prev.tabs.slice()
			nextTabs[idx] = { ...current, title: nextTitle, titleAuto }
			return { ...prev, tabs: nextTabs }
		})
	}, [])

	return {
		tabs: state.tabs,
		activeTabId: state.activeTabId,
		activeTab,
		openTab,
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
		setActiveSql
	}
}
