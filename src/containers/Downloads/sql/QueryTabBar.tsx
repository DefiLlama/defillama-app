import * as Ariakit from '@ariakit/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import type { QueryTab } from './useSqlTabs'

interface QueryTabBarProps {
	tabs: QueryTab[]
	activeTabId: string
	onFocus: (id: string) => void
	onClose: (id: string) => void
	onNewTab: () => void
	onNewNotebookTab: () => void
	onRename: (id: string, title: string) => void
	onDuplicate: (id: string) => void
	onCloseOthers: (id: string) => void
	onCloseToRight: (id: string) => void
	onConvertToNotebook?: (id: string) => void
}

interface ContextMenuState {
	id: string
	anchor: { x: number; y: number }
}

export function QueryTabBar({
	tabs,
	activeTabId,
	onFocus,
	onClose,
	onNewTab,
	onNewNotebookTab,
	onRename,
	onDuplicate,
	onCloseOthers,
	onCloseToRight,
	onConvertToNotebook
}: QueryTabBarProps) {
	const scrollerRef = useRef<HTMLDivElement | null>(null)
	const activeRef = useRef<HTMLButtonElement | null>(null)
	const [renamingId, setRenamingId] = useState<string | null>(null)
	const [menu, setMenu] = useState<ContextMenuState | null>(null)
	const [showLeftFade, setShowLeftFade] = useState(false)
	const [showRightFade, setShowRightFade] = useState(false)

	useLayoutEffect(() => {
		activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
	}, [activeTabId])

	const updateFades = useCallback(() => {
		const el = scrollerRef.current
		if (!el) return
		setShowLeftFade(el.scrollLeft > 2)
		setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
	}, [])

	useEffect(() => {
		updateFades()
		const el = scrollerRef.current
		if (!el) return
		const onScroll = () => updateFades()
		el.addEventListener('scroll', onScroll, { passive: true })
		const ro = new ResizeObserver(updateFades)
		ro.observe(el)
		return () => {
			el.removeEventListener('scroll', onScroll)
			ro.disconnect()
		}
	}, [updateFades, tabs.length])

	const handleContextMenu = (e: React.MouseEvent, id: string) => {
		e.preventDefault()
		setMenu({ id, anchor: { x: e.clientX, y: e.clientY } })
	}

	const canClose = tabs.length > 1
	const menuTab = menu ? tabs.find((t) => t.id === menu.id) : null
	const menuIndex = menu ? tabs.findIndex((t) => t.id === menu.id) : -1

	return (
		<div className="relative flex items-end border-b border-(--divider)">
			<div
				ref={scrollerRef}
				className="flex thin-scrollbar min-w-0 flex-1 items-end gap-0.5 overflow-x-auto overflow-y-hidden"
				style={{
					scrollbarWidth: 'thin',
					maskImage:
						showLeftFade && showRightFade
							? 'linear-gradient(90deg, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)'
							: showLeftFade
								? 'linear-gradient(90deg, transparent 0, black 24px, black 100%)'
								: showRightFade
									? 'linear-gradient(90deg, black 0, black calc(100% - 24px), transparent 100%)'
									: undefined
				}}
			>
				{tabs.map((tab) => {
					const active = tab.id === activeTabId
					const isRenaming = renamingId === tab.id
					return (
						<TabPill
							key={tab.id}
							tab={tab}
							active={active}
							canClose={canClose}
							isRenaming={isRenaming}
							onFocus={() => onFocus(tab.id)}
							onClose={() => onClose(tab.id)}
							onStartRename={() => setRenamingId(tab.id)}
							onFinishRename={(title) => {
								onRename(tab.id, title)
								setRenamingId(null)
							}}
							onCancelRename={() => setRenamingId(null)}
							onContextMenu={(e) => handleContextMenu(e, tab.id)}
							activeRef={active ? activeRef : null}
						/>
					)
				})}
				<NewTabMenu onNewTab={onNewTab} onNewNotebook={onNewNotebookTab} />
			</div>

			{menu && menuTab ? (
				<Ariakit.MenuProvider
					open
					setOpen={(open) => {
						if (!open) setMenu(null)
					}}
				>
					<Ariakit.Menu
						getAnchorRect={() => ({
							x: menu.anchor.x,
							y: menu.anchor.y,
							width: 0,
							height: 0,
							top: menu.anchor.y,
							left: menu.anchor.x,
							right: menu.anchor.x,
							bottom: menu.anchor.y
						})}
						gutter={2}
						className="z-50 min-w-[200px] rounded-md border border-(--divider) bg-(--cards-bg) p-1 text-xs text-(--text-primary) shadow-lg"
					>
						<Ariakit.MenuItem
							onClick={() => {
								setRenamingId(menu.id)
								setMenu(null)
							}}
							className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-(--link-hover-bg)"
						>
							<Icon name="pencil" className="h-3 w-3 text-(--text-tertiary)" />
							Rename
						</Ariakit.MenuItem>
						<Ariakit.MenuItem
							onClick={() => {
								onDuplicate(menu.id)
								setMenu(null)
							}}
							className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-(--link-hover-bg)"
						>
							<Icon name="copy" className="h-3 w-3 text-(--text-tertiary)" />
							Duplicate
						</Ariakit.MenuItem>
						{menuTab.mode === 'query' && onConvertToNotebook ? (
							<Ariakit.MenuItem
								onClick={() => {
									onConvertToNotebook(menu.id)
									setMenu(null)
								}}
								className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-(--link-hover-bg)"
							>
								<Icon name="layers" className="h-3 w-3 text-(--text-tertiary)" />
								Convert to notebook
							</Ariakit.MenuItem>
						) : null}
						<div className="my-1 h-px bg-(--divider)" />
						<Ariakit.MenuItem
							disabled={!canClose}
							onClick={() => {
								onClose(menu.id)
								setMenu(null)
							}}
							className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40"
						>
							<Icon name="x" className="h-3 w-3 text-(--text-tertiary)" />
							Close
						</Ariakit.MenuItem>
						<Ariakit.MenuItem
							disabled={tabs.length <= 1}
							onClick={() => {
								onCloseOthers(menu.id)
								setMenu(null)
							}}
							className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40"
						>
							<Icon name="x" className="h-3 w-3 text-(--text-tertiary)" />
							Close others
						</Ariakit.MenuItem>
						<Ariakit.MenuItem
							disabled={menuIndex === -1 || menuIndex >= tabs.length - 1}
							onClick={() => {
								onCloseToRight(menu.id)
								setMenu(null)
							}}
							className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40"
						>
							<Icon name="arrow-right" className="h-3 w-3 text-(--text-tertiary)" />
							Close tabs to the right
						</Ariakit.MenuItem>
					</Ariakit.Menu>
				</Ariakit.MenuProvider>
			) : null}
		</div>
	)
}

function NewTabMenu({ onNewTab, onNewNotebook }: { onNewTab: () => void; onNewNotebook: () => void }) {
	return (
		<Ariakit.MenuProvider>
			<Ariakit.MenuButton
				aria-label="New tab"
				title="New tab (⌘T)"
				className="sticky right-0 mb-px ml-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-(--app-bg) text-(--text-tertiary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
			>
				<Icon name="plus" className="h-3.5 w-3.5" />
			</Ariakit.MenuButton>
			<Ariakit.Menu
				gutter={4}
				className="z-50 min-w-[180px] rounded-md border border-(--divider) bg-(--cards-bg) p-1 text-xs text-(--text-primary) shadow-lg"
			>
				<Ariakit.MenuItem
					onClick={onNewTab}
					className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-(--link-hover-bg)"
				>
					<Icon name="file-text" className="h-3 w-3 text-(--text-tertiary)" />
					<span className="flex-1">New query tab</span>
					<span className="font-mono text-[10px] text-(--text-tertiary)">⌘T</span>
				</Ariakit.MenuItem>
				<Ariakit.MenuItem
					onClick={onNewNotebook}
					className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-(--link-hover-bg)"
				>
					<Icon name="layers" className="h-3 w-3 text-(--text-tertiary)" />
					<span className="flex-1">New notebook tab</span>
				</Ariakit.MenuItem>
			</Ariakit.Menu>
		</Ariakit.MenuProvider>
	)
}

interface TabPillProps {
	tab: QueryTab
	active: boolean
	canClose: boolean
	isRenaming: boolean
	onFocus: () => void
	onClose: () => void
	onStartRename: () => void
	onFinishRename: (title: string) => void
	onCancelRename: () => void
	onContextMenu: (e: React.MouseEvent) => void
	activeRef: React.MutableRefObject<HTMLButtonElement | null> | null
}

function TabPill({
	tab,
	active,
	canClose,
	isRenaming,
	onFocus,
	onClose,
	onStartRename,
	onFinishRename,
	onCancelRename,
	onContextMenu,
	activeRef
}: TabPillProps) {
	const base =
		'group relative flex h-8 min-w-[120px] max-w-[240px] shrink-0 items-center gap-1.5 rounded-t-md border-x border-t px-2.5 pr-1.5 text-[13px] transition-colors before:pointer-events-none before:absolute before:-left-px before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-px before:bg-(--divider)/70 first:before:hidden aria-selected:before:hidden hover:before:hidden [[aria-selected=true]+&]:before:hidden'
	const activeCls = 'border-(--divider) bg-(--app-bg) text-(--text-primary)'
	const inactiveCls =
		'border-transparent bg-transparent text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'

	const handleMouseDown = (e: React.MouseEvent) => {
		if (e.button === 1 && canClose) {
			e.preventDefault()
			onClose()
		}
	}

	const isNotebook = tab.mode === 'notebook'
	const running = tab.running || (tab.cells?.some((c) => c.running) ?? false)
	const dirty = tab.dirty || (tab.cells?.some((c) => c.dirty) ?? false)

	return (
		<button
			ref={activeRef ?? undefined}
			type="button"
			role="tab"
			aria-selected={active}
			onClick={onFocus}
			onMouseDown={handleMouseDown}
			onDoubleClick={onStartRename}
			onContextMenu={onContextMenu}
			title={isNotebook ? `Notebook · ${tab.title}` : tab.title}
			className={`${base} ${active ? activeCls : inactiveCls}`}
		>
			<span aria-hidden className="flex h-3 w-3 shrink-0 items-center justify-center">
				{running ? (
					<LoadingSpinner size={10} />
				) : dirty ? (
					<span className="h-1.5 w-1.5 rounded-full bg-pro-gold-300" />
				) : null}
			</span>
			{isNotebook ? (
				<Icon
					name="layers"
					aria-label="Notebook tab"
					className={`h-3 w-3 shrink-0 ${active ? 'text-(--text-secondary)' : 'text-(--text-tertiary)'}`}
				/>
			) : null}
			{isRenaming ? (
				<RenameInput initial={tab.title} onCommit={onFinishRename} onCancel={onCancelRename} />
			) : (
				<span className="min-w-0 flex-1 truncate text-left font-medium">{tab.title}</span>
			)}
			{canClose ? (
				<span
					role="button"
					tabIndex={-1}
					aria-label={`Close ${tab.title}`}
					onClick={(e) => {
						e.stopPropagation()
						onClose()
					}}
					onMouseDown={(e) => e.stopPropagation()}
					className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-(--text-tertiary) transition-opacity hover:bg-(--link-hover-bg) hover:text-(--text-primary) ${
						active
							? 'opacity-60 hover:opacity-100'
							: 'opacity-0 group-focus-within:opacity-60 group-hover:opacity-60 hover:!opacity-100'
					}`}
				>
					<Icon name="x" className="h-3 w-3" />
				</span>
			) : null}
			{active ? <span aria-hidden className="absolute inset-x-0 -bottom-px h-px bg-(--app-bg)" /> : null}
		</button>
	)
}

function RenameInput({
	initial,
	onCommit,
	onCancel
}: {
	initial: string
	onCommit: (title: string) => void
	onCancel: () => void
}) {
	const [value, setValue] = useState(initial)
	const inputRef = useRef<HTMLInputElement | null>(null)

	useLayoutEffect(() => {
		inputRef.current?.focus()
		inputRef.current?.select()
	}, [])

	return (
		<input
			ref={inputRef}
			value={value}
			onChange={(e) => setValue(e.target.value)}
			onKeyDown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault()
					onCommit(value)
				} else if (e.key === 'Escape') {
					e.preventDefault()
					onCancel()
				}
				e.stopPropagation()
			}}
			onBlur={() => onCommit(value)}
			onClick={(e) => e.stopPropagation()}
			onDoubleClick={(e) => e.stopPropagation()}
			onMouseDown={(e) => e.stopPropagation()}
			className="min-w-0 flex-1 rounded-sm bg-(--bg-primary) px-1 py-px text-[13px] font-medium text-(--text-primary) ring-1 ring-(--primary) outline-none"
		/>
	)
}
