import { useVirtualizer } from '@tanstack/react-virtual'
import { type CSSProperties, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { AgenticSessionItem } from '~/containers/LlamaAI/components/sidebar/AgenticSessionItem'
import type { ChatSession } from '~/containers/LlamaAI/types'
import { trackUmamiEvent } from '~/utils/analytics/umami'

interface AgenticSidebarProps {
	sessions: ChatSession[]
	isLoading: boolean
	loadError?: string | null
	currentSessionId: string | null
	restoringSessionId: string | null
	onSessionSelect: (sessionId: string) => void
	onNewChat: () => void
	handleSidebarToggle: () => void
	onDelete: (sessionId: string) => Promise<void>
	onUpdateTitle: (args: { sessionId: string; title: string }) => Promise<void>
	isDeletingSession: boolean
	isUpdatingTitle: boolean
	shouldAnimate?: boolean
	onOpenSettings?: () => void
	hasCustomInstructions?: boolean
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

function VirtualizedSidebarItem({
	item,
	itemStyle,
	currentSessionId,
	restoringSessionId,
	deletingSessionId,
	updatingTitleSessionId,
	onSessionSelect,
	onDelete,
	onUpdateTitle,
	handleSidebarToggle
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
	handleSidebarToggle: () => void
}) {
	if (item.type === 'header') {
		return (
			<div style={itemStyle}>
				<h2 className={`text-xs text-[#666] dark:text-[#919296] ${item.isFirst ? 'pt-0' : 'pt-2.5'}`}>
					{item.groupName}
				</h2>
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
			handleSidebarToggle={handleSidebarToggle}
			style={itemStyle}
		/>
	)
}

export function AgenticSidebar({
	sessions,
	isLoading,
	loadError = null,
	currentSessionId,
	restoringSessionId,
	onSessionSelect,
	onNewChat,
	handleSidebarToggle,
	onDelete,
	onUpdateTitle,
	isDeletingSession: _isDeletingSession,
	isUpdatingTitle: _isUpdatingTitle,
	shouldAnimate = false,
	onOpenSettings,
	hasCustomInstructions
}: AgenticSidebarProps) {
	const sidebarRef = useRef<HTMLDivElement>(null)
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
	const [updatingTitleSessionId, setUpdatingTitleSessionId] = useState<string | null>(null)

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
	const groupedSessions = useMemo(() => {
		return Object.entries(
			sessions.reduce((acc: Record<string, Array<ChatSession>>, session) => {
				const groupName = getGroupName(session.lastActivity, nowMs)
				acc[groupName] = [...(acc[groupName] || []), session]
				return acc
			}, {})
		).sort((a, b) => Date.parse(b[1][0].lastActivity) - Date.parse(a[1][0].lastActivity)) as Array<
			[string, Array<ChatSession>]
		>
	}, [sessions, nowMs])

	const virtualItems = useMemo(() => {
		const items: VirtualItem[] = []
		for (let groupIndex = 0; groupIndex < groupedSessions.length; groupIndex++) {
			const [groupName, groupSessions] = groupedSessions[groupIndex]
			items.push({ type: 'header', groupName, isFirst: groupIndex === 0 })
			for (const session of groupSessions) {
				items.push({ type: 'session', session, groupName })
			}
		}
		return items
	}, [groupedSessions])

	const virtualizer = useVirtualizer({
		count: virtualItems.length,
		getScrollElement: () => scrollContainerRef.current,
		estimateSize: (index) => {
			const item = virtualItems[index]
			if (item.type === 'header') {
				return item.isFirst ? 20 : 32
			}
			return 32
		},
		overscan: 5
	})

	const onClickOutside = useEffectEvent((event: MouseEvent) => {
		if (
			event.target instanceof Node &&
			sidebarRef.current &&
			!sidebarRef.current.contains(event.target) &&
			document.documentElement.clientWidth < 1024
		) {
			handleSidebarToggle()
		}
	})

	useEffect(() => {
		document.addEventListener('mousedown', onClickOutside)
		return () => document.removeEventListener('mousedown', onClickOutside)
	}, [])

	return (
		<aside
			ref={sidebarRef}
			className={`relative flex h-full w-full max-w-[272px] flex-col rounded-lg border border-[#e6e6e6] bg-(--cards-bg) max-lg:absolute max-lg:top-0 max-lg:right-0 max-lg:bottom-0 max-lg:left-0 max-lg:z-10 lg:mr-2 dark:border-[#222324] ${shouldAnimate ? 'animate-[slideInRight_0.08s_ease-out]' : ''}`}
		>
			<header className="flex flex-col gap-2 p-4">
				<Tooltip
					content="Close Chat History"
					render={<button onClick={handleSidebarToggle} />}
					className="ml-auto flex h-6 w-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue)/12 text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
				>
					<Icon name="panel-left-close" height={16} width={16} />
					<span className="sr-only">Close Chat History</span>
				</Tooltip>

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
			</header>

			<nav
				ref={scrollContainerRef}
				className="thin-scrollbar flex-1 overflow-auto p-4 pt-0 pr-1"
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
				) : (
					<div
						style={{
							height: `${virtualizer.getTotalSize()}px`,
							width: '100%',
							position: 'relative'
						}}
					>
						{virtualizer.getVirtualItems().map((virtualItem) => {
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
									handleSidebarToggle={handleSidebarToggle}
								/>
							)
						})}
					</div>
				)}
			</nav>

			{onOpenSettings ? (
				<footer className="border-t border-[#e6e6e6] p-3 dark:border-[#222324]">
					<button
						onClick={onOpenSettings}
						className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs text-[#666] transition-colors hover:bg-[#f0f0f0] hover:text-[#1a1a1a] dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white"
					>
						<div className="relative">
							<Icon name="settings" height={14} width={14} />
							{hasCustomInstructions ? (
								<span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[#1853A8] dark:bg-[#4B86DB]" />
							) : null}
						</div>
						<span>Settings</span>
					</button>
				</footer>
			) : null}
		</aside>
	)
}
