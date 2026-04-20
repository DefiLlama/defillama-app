import * as Ariakit from '@ariakit/react'
import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { CookbookTab, ShortcutsTab } from './DocsPanel'
import { SchemaBrowser, type SchemaBrowserProps } from './SchemaBrowser'

interface SchemaDrawerProps extends SchemaBrowserProps {
	open: boolean
	onClose: () => void
	totalDatasetCount: number
	onApplyAndRun: (sql: string) => void
}

const TABS = [
	{ id: 'schema', label: 'Schema' },
	{ id: 'cookbook', label: 'Cookbook' },
	{ id: 'shortcuts', label: 'Shortcuts' }
] as const
type TabId = (typeof TABS)[number]['id']

const DESCRIPTIONS: Record<TabId, string> = {
	schema: 'Browse every queryable table. Insert a SELECT or load the CSV into this session.',
	cookbook: 'Pragmatic DuckDB idioms against DefiLlama tables. Try it replaces the editor and runs.',
	shortcuts: 'Editor keybindings and DuckDB dialect gotchas worth keeping in muscle memory.'
}

export function SchemaDrawer({
	open,
	onClose,
	totalDatasetCount,
	onReplaceSql,
	onInsertAtCursor,
	onApplyAndRun,
	...browserProps
}: SchemaDrawerProps) {
	const [tab, setTab] = useState<TabId>('schema')

	const wrappedReplace = (snippet: string) => {
		onReplaceSql(snippet)
		onClose()
	}

	return (
		<Ariakit.DialogProvider
			open={open}
			setOpen={(next) => {
				if (!next) onClose()
			}}
		>
			<Ariakit.Dialog
				unmountOnHide
				backdrop={
					<div className="fixed inset-0 z-40 bg-black/20 opacity-0 transition-opacity duration-150 data-enter:opacity-100 dark:bg-black/40" />
				}
				className="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[640px] drawer-to-left flex-col overflow-hidden border-l border-(--divider) bg-(--cards-bg) shadow-2xl sm:max-w-[560px] lg:max-w-[640px]"
			>
				<header className="flex items-start justify-between gap-3 border-b border-(--divider) bg-(--app-bg)/40 px-5 py-3.5">
					<div className="flex min-w-0 flex-col gap-0.5">
						<h2 className="text-sm font-semibold tracking-tight text-(--text-primary)">SQL reference</h2>
						<p className="text-[11.5px] leading-snug text-(--text-tertiary)">
							{tab === 'schema' ? (
								<>
									{totalDatasetCount} tables · {DESCRIPTIONS[tab]}
								</>
							) : (
								DESCRIPTIONS[tab]
							)}
						</p>
					</div>
					<Ariakit.DialogDismiss
						onClick={onClose}
						aria-label="Close SQL reference"
						className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-(--text-tertiary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
					>
						<Icon name="x" className="h-4 w-4" />
					</Ariakit.DialogDismiss>
				</header>

				<TabBar tab={tab} onChange={setTab} />

				<div className="thin-scrollbar flex-1 overflow-y-auto px-5 py-4">
					{tab === 'schema' ? (
						<SchemaBrowser
							{...browserProps}
							onReplaceSql={wrappedReplace}
							onInsertAtCursor={onInsertAtCursor}
						/>
					) : tab === 'cookbook' ? (
						<CookbookTab
							onApplyAndRun={(sql) => {
								onClose()
								onApplyAndRun(sql)
							}}
						/>
					) : (
						<ShortcutsTab />
					)}
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}

function TabBar({ tab, onChange }: { tab: TabId; onChange: (next: TabId) => void }) {
	return (
		<nav
			role="tablist"
			aria-label="SQL reference section"
			className="flex items-center gap-5 border-b border-(--divider) px-5 text-sm"
		>
			{TABS.map((t) => {
				const active = tab === t.id
				return (
					<button
						key={t.id}
						role="tab"
						type="button"
						aria-selected={active}
						onClick={() => onChange(t.id)}
						className={`group relative flex items-center gap-1.5 pt-2.5 pb-2 text-xs font-medium transition-colors ${
							active ? 'text-(--primary)' : 'text-(--text-secondary) hover:text-(--text-primary)'
						}`}
					>
						{t.label}
						{active ? (
							<span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-(--primary)" />
						) : null}
					</button>
				)
			})}
		</nav>
	)
}
