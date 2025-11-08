import { useEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useChatHistory, type ChatSession } from '../hooks/useChatHistory'
import { SessionItem } from './SessionItem'

interface ChatHistorySidebarProps {
	handleSidebarToggle: () => void
	currentSessionId: string | null
	onSessionSelect: (sessionId: string, data: { conversationHistory: any[]; pagination?: any }) => void
	onNewChat: () => void
	shouldAnimate?: boolean
}

function getGroupName(lastActivity: string) {
	return new Date(lastActivity).getTime() >= Date.now() - 24 * 60 * 60 * 1000
		? 'Today'
		: new Date(lastActivity).getTime() >= Date.now() - 48 * 60 * 60 * 1000
			? 'Yesterday'
			: new Date(lastActivity).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000
				? 'This week'
				: new Date(lastActivity).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000
					? 'This month'
					: 'Older'
}

type VirtualItem =
	| { type: 'header'; groupName: string; isFirst: boolean }
	| { type: 'session'; session: ChatSession; groupName: string }

export function ChatHistorySidebar({
	handleSidebarToggle,
	currentSessionId,
	onSessionSelect,
	onNewChat,
	shouldAnimate = false
}: ChatHistorySidebarProps) {
	const { user } = useAuthContext()
	const { sessions, isLoading } = useChatHistory()
	const sidebarRef = useRef<HTMLDivElement>(null)
	const scrollContainerRef = useRef<HTMLDivElement>(null)

	const groupedSessions = useMemo(() => {
		return Object.entries(
			sessions.reduce((acc: Record<string, Array<ChatSession>>, session) => {
				const groupName = getGroupName(session.lastActivity)
				acc[groupName] = [...(acc[groupName] || []), session]
				return acc
			}, {})
		).sort((a, b) => Date.parse(b[1][0].lastActivity) - Date.parse(a[1][0].lastActivity)) as Array<
			[string, Array<ChatSession>]
		>
	}, [sessions])

	const virtualItems = useMemo(() => {
		const items: VirtualItem[] = []
		groupedSessions.forEach(([groupName, groupSessions], groupIndex) => {
			items.push({ type: 'header', groupName, isFirst: groupIndex === 0 })
			groupSessions.forEach((session) => {
				items.push({ type: 'session', session, groupName })
			})
		})
		return items
	}, [groupedSessions])

	const virtualizer = useVirtualizer({
		count: virtualItems.length,
		getScrollElement: () => scrollContainerRef.current,
		estimateSize: (index) => {
			const item = virtualItems[index]
			if (item.type === 'header') {
				return item.isFirst ? 20 : 32 // First header has less padding
			}
			return 32 // Session item height
		},
		overscan: 5
	})

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			// Check if event.target is a Node and if click is outside the sidebar
			if (
				event.target instanceof Node &&
				sidebarRef.current &&
				!sidebarRef.current.contains(event.target) &&
				document.documentElement.clientWidth < 1024
			) {
				handleSidebarToggle()
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [handleSidebarToggle])

	if (!user) return null

	return (
		<div
			ref={sidebarRef}
			className={`relative flex h-full w-full max-w-[272px] flex-col rounded-lg border border-[#e6e6e6] bg-(--cards-bg) max-lg:absolute max-lg:top-0 max-lg:right-0 max-lg:bottom-0 max-lg:left-0 max-lg:z-10 lg:mr-2 dark:border-[#222324] ${shouldAnimate ? 'animate-[slideInRight_0.08s_ease-out]' : ''}`}
		>
			<div className="flex flex-col gap-2 p-4">
				<Tooltip
					content="Close Chat History"
					render={<button onClick={handleSidebarToggle} />}
					className="ml-auto flex h-6 w-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue)/12 text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
				>
					<Icon name="panel-left-close" height={16} width={16} />
					<span className="sr-only">Close Chat History</span>
				</Tooltip>

				<button
					onClick={onNewChat}
					className="flex flex-1 items-center justify-center gap-2 rounded-sm border border-(--old-blue) bg-(--old-blue)/12 px-2 py-0.75 text-xs text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
				>
					<Icon name="message-square-plus" height={16} width={16} />
					<span>New Chat</span>
				</button>
			</div>

			<div ref={scrollContainerRef} className="thin-scrollbar flex-1 overflow-auto p-4 pt-0 pr-1">
				{isLoading ? (
					<div className="flex items-center justify-center rounded-sm border border-dashed border-[#666]/50 p-4 text-center text-xs text-[#666] dark:border-[#919296]/50 dark:text-[#919296]">
						<LoadingSpinner size={12} />
					</div>
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
							const style = {
								position: 'absolute' as const,
								top: 0,
								left: 0,
								width: '100%',
								height: `${virtualItem.size}px`,
								transform: `translateY(${virtualItem.start}px)`
							}

							if (item.type === 'header') {
								return (
									<div key={`header-${item.groupName}`} style={style}>
										<h2 className={`text-xs text-[#666] dark:text-[#919296] ${item.isFirst ? 'pt-0' : 'pt-2.5'}`}>
											{item.groupName}
										</h2>
									</div>
								)
							}

							return (
								<SessionItem
									key={`session-${item.session.sessionId}-${item.session.isPublic}-${item.session.lastActivity}`}
									session={item.session}
									isActive={item.session.sessionId === currentSessionId}
									onSessionSelect={onSessionSelect}
									handleSidebarToggle={handleSidebarToggle}
									style={style}
								/>
							)
						})}
					</div>
				)}
			</div>
		</div>
	)
}
