import { type Virtualizer, useVirtualizer } from '@tanstack/react-virtual'
import {
	type CSSProperties,
	lazy,
	memo,
	Suspense,
	useCallback,
	useEffect,
	useEffectEvent,
	useMemo,
	useRef,
	useState
} from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { useLlamaAIChrome } from '~/containers/LlamaAI/chrome'
import { AgenticSessionItem } from '~/containers/LlamaAI/components/sidebar/AgenticSessionItem'
import { SearchResults } from '~/containers/LlamaAI/components/sidebar/SearchResults'
import { useSemanticSearch } from '~/containers/LlamaAI/hooks/useSemanticSearch'
import { ProjectsSidebarSection } from '~/containers/LlamaAI/projects/ProjectsSidebarSection'
import type { ChatSession } from '~/containers/LlamaAI/types'
import { useAuthContext } from '~/containers/Subscription/auth'
import { useAiBalance } from '~/containers/Subscription/useTopup'
import { trackUmamiEvent } from '~/utils/analytics/umami'

const TopupModal = lazy(() => import('~/components/TopupModal').then((m) => ({ default: m.TopupModal })))

interface AgenticSidebarProps {
	sessions: ChatSession[]
	isLoading: boolean
	loadError?: string | null
	currentSessionId: string | null
	restoringSessionId: string | null
	onSessionSelect: (sessionId: string) => void
	onNewChat: () => void
	onDelete: (sessionId: string) => Promise<void>
	onUpdateTitle: (args: { sessionId: string; title: string }) => Promise<void>
	isDeletingSession: boolean
	isUpdatingTitle: boolean
	shouldAnimate?: boolean
	onOpenSettings?: () => void
	hasCustomInstructions?: boolean
	onBulkDelete?: (sessionIds: string[]) => Promise<void>
	onPinSession?: (sessionId: string) => Promise<void>
	onSearchMatchClick?: (sessionId: string, messageId: string) => void
	hasMoreSessions?: boolean
	isFetchingMoreSessions?: boolean
	loadMoreSessionsError?: string | null
	onLoadMoreSessions?: () => void
	currentProjectId?: string | null
}

function getGroupName(lastActivity: string, now: number) {
	const t = new Date(lastActivity).getTime()
	return t >= now - 24 * 60 * 60 * 1000
		? 'Today'
		: t >= now - 48 * 60 * 60 * 1000
			? 'Yesterday'
			: t >= now - 7 * 24 * 60 * 60 * 1000
				? 'This week'
				: t >= now - 30 * 24 * 60 * 60 * 1000
					? 'This month'
					: 'Older'
}

type VirtualItem =
	| { type: 'header'; groupName: string; isFirst: boolean }
	| { type: 'session'; session: ChatSession; groupName: string }
	| { type: 'loader'; isFetching: boolean; loadError: string | null; onLoadMore?: () => void }

const VirtualizedSidebarItem = memo(function VirtualizedSidebarItem({
	item,
	itemStyle,
	currentSessionId,
	restoringSessionId,
	deletingSessionId,
	updatingTitleSessionId,
	onSessionSelect,
	onDelete,
	onUpdateTitle,
	selectMode,
	isSelected,
	onToggleSelect,
	onPinSession
}: {
	item: VirtualItem
	itemStyle: CSSProperties
	currentSessionId: string | null
	restoringSessionId: string | null
	deletingSessionId: string | null
	updatingTitleSessionId: string | null
	onSessionSelect: (sessionId: string) => void
	onDelete: (sessionId: string) => Promise<void>
	onUpdateTitle: (args: { sessionId: string; title: string }) => Promise<void>
	selectMode: boolean
	isSelected: boolean
	onToggleSelect: (sessionId: string) => void
	onPinSession?: (sessionId: string) => Promise<void>
}) {
	if (item.type === 'header') {
		return (
			<h2
				style={itemStyle}
				className={`flex items-center gap-1 text-xs text-[#666] dark:text-[#919296] ${item.isFirst ? 'pt-0' : 'pt-2.5'}`}
			>
				{item.groupName === 'Pinned' ? <Icon name="pin" height={10} width={10} className="shrink-0" /> : null}
				{item.groupName}
			</h2>
		)
	}

	if (item.type === 'loader') {
		if (item.loadError) {
			return (
				<div style={itemStyle} className="flex items-center justify-center py-1.5">
					<button
						type="button"
						onClick={() => item.onLoadMore?.()}
						className="rounded-sm px-2 py-1 text-xs text-[#666] hover:bg-[#f7f7f7] dark:text-[#919296] dark:hover:bg-[#222324]"
					>
						Retry loading chats
					</button>
				</div>
			)
		}

		return (
			<div style={itemStyle} className="flex items-center justify-center py-2 text-xs text-[#666] dark:text-[#919296]">
				{item.isFetching ? <LoadingSpinner size={12} /> : null}
			</div>
		)
	}

	return (
		<AgenticSessionItem
			session={item.session}
			isActive={item.session.sessionId === currentSessionId}
			onSessionSelect={onSessionSelect}
			onDelete={onDelete}
			onUpdateTitle={onUpdateTitle}
			isRestoring={restoringSessionId === item.session.sessionId}
			isDeleting={deletingSessionId === item.session.sessionId}
			isUpdatingTitle={updatingTitleSessionId === item.session.sessionId}
			style={itemStyle}
			selectMode={selectMode}
			isSelected={isSelected}
			onToggleSelect={onToggleSelect}
			onPinSession={onPinSession}
		/>
	)
})

export function AgenticSidebar({
	sessions,
	isLoading,
	loadError = null,
	currentSessionId,
	restoringSessionId,
	onSessionSelect,
	onNewChat,
	onDelete,
	onUpdateTitle,
	isDeletingSession: _isDeletingSession,
	isUpdatingTitle: _isUpdatingTitle,
	shouldAnimate = false,
	onOpenSettings,
	hasCustomInstructions,
	onBulkDelete,
	onPinSession,
	onSearchMatchClick,
	hasMoreSessions = false,
	isFetchingMoreSessions = false,
	loadMoreSessionsError = null,
	onLoadMoreSessions,
	currentProjectId = null
}: AgenticSidebarProps) {
	const { hideSidebar, isFullscreen, toggleFullscreen, toggleSidebar } = useLlamaAIChrome()
	const sidebarRef = useRef<HTMLDivElement>(null)
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
	const [updatingTitleSessionId, setUpdatingTitleSessionId] = useState<string | null>(null)
	const [selectMode, setSelectMode] = useState(false)
	const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set())
	const { balance, totalAvailable } = useAiBalance()
	const { hasActiveSubscription } = useAuthContext()
	const [isTopupModalOpen, setIsTopupModalOpen] = useState(false)
	const {
		query: searchQuery,
		setQuery: setSearchQuery,
		results: searchResults,
		isSearching,
		clear: clearSearch
	} = useSemanticSearch()

	const toggleSelect = useCallback((sessionId: string) => {
		setSelectedSessionIds((prev) => {
			const next = new Set(prev)
			if (next.has(sessionId)) {
				next.delete(sessionId)
			} else {
				next.add(sessionId)
			}
			return next
		})
	}, [])

	const handleBulkDelete = useCallback(async () => {
		if (selectedSessionIds.size === 0 || !onBulkDelete) return
		const count = selectedSessionIds.size
		if (!window.confirm(`Delete ${count} session${count > 1 ? 's' : ''}?`)) return
		try {
			await onBulkDelete([...selectedSessionIds])
			setSelectMode(false)
			setSelectedSessionIds(new Set())
		} catch {
			// rollback handled by mutation
		}
	}, [selectedSessionIds, onBulkDelete])

	const exitSelectMode = useCallback(() => {
		setSelectMode(false)
		setSelectedSessionIds(new Set())
	}, [])

	const handleDelete = useCallback(
		(sessionId: string) => {
			setDeletingSessionId(sessionId)
			return onDelete(sessionId).finally(() => {
				setDeletingSessionId(null)
			})
		},
		[onDelete]
	)

	const handleUpdateTitle = useCallback(
		(args: { sessionId: string; title: string }) => {
			setUpdatingTitleSessionId(args.sessionId)
			return onUpdateTitle(args).finally(() => {
				setUpdatingTitleSessionId(null)
			})
		},
		[onUpdateTitle]
	)

	const [nowMs] = useState(() => Date.now())
	const trimmedSearchQuery = searchQuery.trim()

	const filteredSessions = useMemo(() => {
		const nonProjectSessions = sessions.filter((s) => !s.projectId)
		if (!trimmedSearchQuery) return nonProjectSessions
		return nonProjectSessions.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
	}, [sessions, searchQuery, trimmedSearchQuery])

	const { pinnedSessions, unpinnedSessions } = useMemo(() => {
		const pinned = filteredSessions
			.filter((s) => s.isPinned)
			.sort((a, b) => new Date(b.pinnedAt || 0).getTime() - new Date(a.pinnedAt || 0).getTime())
		const unpinned = filteredSessions.filter((s) => !s.isPinned)
		return { pinnedSessions: pinned, unpinnedSessions: unpinned }
	}, [filteredSessions])

	const groupedSessions = useMemo(() => {
		return Object.entries(
			unpinnedSessions.reduce((acc: Record<string, Array<ChatSession>>, session) => {
				const groupName = getGroupName(session.lastActivity, nowMs)
				acc[groupName] = [...(acc[groupName] || []), session]
				return acc
			}, {})
		).sort((a, b) => Date.parse(b[1][0].lastActivity) - Date.parse(a[1][0].lastActivity)) as Array<
			[string, Array<ChatSession>]
		>
	}, [unpinnedSessions, nowMs])

	const virtualItems = useMemo(() => {
		const items: VirtualItem[] = []
		if (pinnedSessions.length > 0) {
			items.push({ type: 'header', groupName: 'Pinned', isFirst: true })
			for (const session of pinnedSessions) {
				items.push({ type: 'session', session, groupName: 'Pinned' })
			}
		}
		for (let groupIndex = 0; groupIndex < groupedSessions.length; groupIndex++) {
			const [groupName, groupSessions] = groupedSessions[groupIndex]
			items.push({ type: 'header', groupName, isFirst: pinnedSessions.length === 0 && groupIndex === 0 })
			for (const session of groupSessions) {
				items.push({ type: 'session', session, groupName })
			}
		}
		if (hasMoreSessions && !trimmedSearchQuery) {
			items.push({
				type: 'loader',
				isFetching: isFetchingMoreSessions,
				loadError: loadMoreSessionsError,
				onLoadMore: onLoadMoreSessions
			})
		}
		return items
	}, [
		pinnedSessions,
		groupedSessions,
		hasMoreSessions,
		isFetchingMoreSessions,
		loadMoreSessionsError,
		onLoadMoreSessions,
		trimmedSearchQuery
	])

	const handleVirtualizerChange = useEffectEvent((instance: Virtualizer<HTMLDivElement, Element>) => {
		if (
			loadMoreSessionsError ||
			!hasMoreSessions ||
			isFetchingMoreSessions ||
			trimmedSearchQuery ||
			!onLoadMoreSessions
		)
			return

		const virtualizedItems = instance.getVirtualItems()
		const lastVirtualItem = virtualizedItems[virtualizedItems.length - 1]
		if (!lastVirtualItem || lastVirtualItem.index < instance.options.count - 3) return

		onLoadMoreSessions()
	})

	const virtualizer = useVirtualizer({
		count: virtualItems.length,
		getScrollElement: () => scrollContainerRef.current,
		estimateSize: (index) => {
			const item = virtualItems[index]
			if (item.type === 'header') {
				return item.isFirst ? 20 : 32
			}
			if (item.type === 'loader') {
				return 36
			}
			return 32
		},
		overscan: 5,
		onChange: handleVirtualizerChange
	})
	const virtualizedItems = virtualizer.getVirtualItems()

	const onClickOutside = useEffectEvent((event: MouseEvent) => {
		if (
			event.target instanceof Node &&
			sidebarRef.current &&
			!sidebarRef.current.contains(event.target) &&
			!(event.target instanceof Element && event.target.closest('[role="dialog"], [role="menu"]')) &&
			document.documentElement.clientWidth < 1024
		) {
			hideSidebar()
		}
	})

	useEffect(() => {
		document.addEventListener('mousedown', onClickOutside)
		return () => document.removeEventListener('mousedown', onClickOutside)
	}, [])

	return (
		<aside
			ref={sidebarRef}
			className={`llamaai-agentic-sidebar relative flex h-full w-full max-w-[272px] flex-col rounded-lg border border-[#e6e6e6] bg-(--cards-bg) max-lg:absolute max-lg:top-0 max-lg:right-0 max-lg:bottom-0 max-lg:left-0 max-lg:z-10 lg:mr-2 dark:border-[#222324] ${shouldAnimate ? 'animate-[slideInRight_0.08s_ease-out]' : ''}`}
		>
			<header className="flex flex-col gap-2 p-4 pb-2">
				<div className="flex items-center">
					{sessions.length > 0 ? (
						<button
							onClick={selectMode ? exitSelectMode : () => setSelectMode(true)}
							className={`flex h-6 items-center gap-1 rounded-sm px-1.5 text-[11px] transition-colors ${
								selectMode
									? 'bg-(--old-blue)/12 text-(--old-blue)'
									: 'text-[#666] hover:text-[#333] dark:text-[#919296] dark:hover:text-white'
							}`}
						>
							<Icon name={selectMode ? 'x' : 'check'} height={12} width={12} />
							{selectMode ? 'Cancel' : 'Select'}
						</button>
					) : null}
					<div className="ml-auto flex items-center gap-2">
						<Tooltip
							content={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
							render={
								<button
									onClick={toggleFullscreen}
									data-umami-event="llamaai-fullscreen-toggle"
									data-umami-event-action={isFullscreen ? 'exit' : 'enter'}
									data-umami-event-source="sidebar_header"
								/>
							}
							className="hidden h-6 w-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue)/12 text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white lg:flex"
						>
							<Icon name={isFullscreen ? 'shrink' : 'expand'} height={16} width={16} />
							<span className="sr-only">{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
						</Tooltip>

						<Tooltip
							content="Close Chat History"
							render={
								<button
									onClick={toggleSidebar}
									data-umami-event="llamaai-sidebar-toggle"
									data-umami-event-action="close"
									data-umami-event-source="sidebar_header"
								/>
							}
							className="flex h-6 w-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue)/12 text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
						>
							<Icon name="panel-left-close" height={16} width={16} />
							<span className="sr-only">Close Chat History</span>
						</Tooltip>
					</div>
				</div>

				<button
					onClick={() => {
						trackUmamiEvent('llamaai-new-chat')
						onNewChat()
					}}
					className="flex items-center justify-center gap-2 rounded-sm border border-(--old-blue) bg-(--old-blue)/12 px-2 py-0.75 text-xs text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
				>
					<Icon name="message-square-plus" height={16} width={16} />
					<span>New Chat</span>
				</button>

				{sessions.length > 0 ? (
					<div className="group/search relative flex items-center rounded-md bg-[#f5f5f5] transition-colors focus-within:bg-[#ebebeb] dark:bg-[#1a1a1b] dark:focus-within:bg-[#222324]">
						<Icon
							name="search"
							height={13}
							width={13}
							className="pointer-events-none ml-2.5 shrink-0 text-[#999] transition-colors group-focus-within/search:text-(--old-blue) dark:text-[#555]"
						/>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search"
							className="min-w-0 flex-1 bg-transparent py-1.5 pr-2 pl-2 text-[11px] text-inherit placeholder:text-[#aaa] focus:outline-none dark:placeholder:text-[#555]"
						/>
						{isSearching ? (
							<Icon name="search" height={11} width={11} className="mr-1.5 shrink-0 animate-pulse text-[#999]" />
						) : null}
						{searchQuery ? (
							<button
								onClick={() => clearSearch()}
								className="mr-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#ccc] text-white transition-colors hover:bg-[#999] dark:bg-[#444] dark:hover:bg-[#666]"
							>
								<Icon name="x" height={8} width={8} />
							</button>
						) : null}
					</div>
				) : null}
			</header>

			<div className="border-b border-[#e6e6e6] pb-3 dark:border-[#222324]">
				<ProjectsSidebarSection
					currentProjectId={currentProjectId}
					currentSessionId={currentSessionId}
					sessions={sessions}
				/>
			</div>

			<nav
				ref={scrollContainerRef}
				className="thin-scrollbar flex-1 overflow-auto overscroll-contain p-4 pt-3 pr-1"
				aria-label="Chat history"
			>
				{isLoading ? (
					<div className="flex items-center justify-center rounded-sm border border-dashed border-[#666]/50 p-4 text-center text-xs text-[#666] dark:border-[#919296]/50 dark:text-[#919296]">
						<LoadingSpinner size={12} />
					</div>
				) : loadError ? (
					<p className="rounded-sm border border-dashed border-red-300 bg-red-50 p-4 text-center text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
						{loadError}
					</p>
				) : sessions.length === 0 ? (
					<p className="rounded-sm border border-dashed border-[#666]/50 p-4 text-center text-xs text-[#666] dark:border-[#919296]/50 dark:text-[#919296]">
						You don't have any chats yet
					</p>
				) : trimmedSearchQuery && (searchResults.length > 0 || isSearching) ? (
					<SearchResults
						results={searchResults}
						isSearching={isSearching}
						query={searchQuery}
						onMatchClick={(sessionId, messageId) => {
							clearSearch()
							onSearchMatchClick?.(sessionId, messageId)
						}}
						onSessionClick={(sessionId) => {
							clearSearch()
							onSessionSelect(sessionId)
						}}
					/>
				) : filteredSessions.length === 0 && trimmedSearchQuery && !isSearching && searchResults.length === 0 ? (
					<p className="rounded-sm border border-dashed border-[#666]/50 p-4 text-center text-xs text-[#666] dark:border-[#919296]/50 dark:text-[#919296]">
						No chats matching &ldquo;{searchQuery}&rdquo;
					</p>
				) : (
					<div
						style={{
							height: `${virtualizer.getTotalSize()}px`,
							width: '100%',
							position: 'relative'
						}}
					>
						{virtualizedItems.map((virtualItem) => {
							const item = virtualItems[virtualItem.index]
							const itemStyle: CSSProperties = {
								position: 'absolute',
								top: 0,
								left: 0,
								width: '100%',
								height: `${virtualItem.size}px`,
								transform: `translateY(${virtualItem.start}px)`
							}

							return (
								<VirtualizedSidebarItem
									key={
										item.type === 'header'
											? `header-${item.groupName}`
											: item.type === 'loader'
												? 'session-loader'
												: `session-${item.session.sessionId}-${item.session.isPublic}-${item.session.lastActivity}`
									}
									item={item}
									itemStyle={itemStyle}
									currentSessionId={currentSessionId}
									restoringSessionId={restoringSessionId}
									deletingSessionId={deletingSessionId}
									updatingTitleSessionId={updatingTitleSessionId}
									onSessionSelect={onSessionSelect}
									onDelete={handleDelete}
									onUpdateTitle={handleUpdateTitle}
									selectMode={selectMode}
									isSelected={item.type === 'session' && selectedSessionIds.has(item.session.sessionId)}
									onToggleSelect={toggleSelect}
									onPinSession={onPinSession}
								/>
							)
						})}
					</div>
				)}
			</nav>

			{balance ? (
				<Tooltip
					content={
						hasActiveSubscription
							? 'Credits that let LlamaAI access premium external data sources like onchain data, X profiles, LinkedIn, and more.'
							: 'Subscribe to a plan to top up your external data balance.'
					}
					render={<button type="button" onClick={() => hasActiveSubscription && setIsTopupModalOpen(true)} />}
					className="flex min-h-[52px] w-full shrink-0 items-center justify-between overflow-hidden border-t border-[#e6e6e6] px-4 py-3 text-ellipsis whitespace-nowrap transition-colors hover:bg-[#f0f0f0] dark:border-[#222324] dark:hover:bg-[#222324]"
				>
					<div className="flex min-w-0 items-center gap-2">
						<Icon name="package" height={14} width={14} className="shrink-0 text-[#5C5CF9]" />
						<span className="text-xs text-[#666] dark:text-[#919296]">External Data Balance</span>
					</div>
					<span
						className={`shrink-0 font-jetbrains text-xs font-semibold ${totalAvailable < 1 ? 'text-yellow-400' : 'text-[#666] dark:text-white'}`}
					>
						${totalAvailable.toFixed(2)}
					</span>
				</Tooltip>
			) : null}

			{selectMode ? (
				<footer className="flex min-h-[52px] shrink-0 items-center gap-2 border-t border-[#e6e6e6] px-4 py-2 dark:border-[#222324]">
					<button
						type="button"
						onClick={() => {
							if (selectedSessionIds.size === filteredSessions.length) {
								setSelectedSessionIds(new Set())
							} else {
								setSelectedSessionIds(new Set(filteredSessions.map((s) => s.sessionId)))
							}
						}}
						className="flex min-h-0 flex-1 items-center justify-center rounded-md px-2 py-2 text-xs text-[#666] transition-colors hover:bg-[#f0f0f0] dark:text-[#919296] dark:hover:bg-[#222324]"
					>
						{selectedSessionIds.size === filteredSessions.length ? 'Deselect All' : 'Select All'}
					</button>
					<button
						type="button"
						onClick={() => void handleBulkDelete()}
						disabled={selectedSessionIds.size === 0 || !onBulkDelete}
						className="flex min-h-0 items-center justify-center rounded-md bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/20 disabled:opacity-40 dark:text-red-400"
					>
						Delete{selectedSessionIds.size > 0 ? ` (${selectedSessionIds.size})` : ''}
					</button>
				</footer>
			) : onOpenSettings ? (
				<button
					type="button"
					onClick={onOpenSettings}
					className="flex min-h-[52px] w-full shrink-0 items-center gap-2.5 border-t border-[#e6e6e6] px-4 py-3 text-left text-xs text-[#666] transition-colors hover:bg-[#f0f0f0] hover:text-[#1a1a1a] dark:border-[#222324] dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white"
				>
					<div className="relative">
						<Icon name="settings" height={14} width={14} />
						{hasCustomInstructions ? (
							<span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[#1853A8] dark:bg-[#4B86DB]" />
						) : null}
					</div>
					<span>Settings</span>
				</button>
			) : null}

			{isTopupModalOpen ? (
				<Suspense fallback={<></>}>
					<TopupModal isOpen={isTopupModalOpen} onClose={() => setIsTopupModalOpen(false)} />
				</Suspense>
			) : null}
		</aside>
	)
}
