import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useDebounce } from '~/hooks/useDebounce'
import { handleSimpleFetchResponse } from '~/utils/async'
import { useChatHistory, type ChatSession } from '../hooks/useChatHistory'
import { SessionItem } from './SessionItem'

interface ChatHistorySidebarProps {
	handleSidebarToggle: () => void
	currentSessionId: string | null
	onSessionSelect: (sessionId: string, data: { messages: any[]; pagination?: any }) => void
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
	const { user, authorizedFetch } = useAuthContext()
	const { sessions, isLoading } = useChatHistory()
	const queryClient = useQueryClient()
	const sidebarRef = useRef<HTMLDivElement>(null)
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const [searchQuery, setSearchQuery] = useState('')
	const debouncedSearchQuery = useDebounce(searchQuery, 300)

	const fetchSessionMessagesForSearch = async (sessionId: string): Promise<any[]> => {
		const allMessages: any[] = []
		let cursor: number | undefined = undefined
		let hasMore = true

		while (hasMore) {
			const params = new URLSearchParams()
			params.append('limit', '100')
			if (cursor !== undefined) {
				params.append('cursor', cursor.toString())
			}

			const url = `${MCP_SERVER}/user/sessions/${sessionId}/restore?${params.toString()}`
			const response = await authorizedFetch(url)
				.then(handleSimpleFetchResponse)
				.then((res) => res.json())

			const messages = response.messages || response.conversationHistory || []
			allMessages.push(...messages)
			hasMore = response.hasMore || false
			cursor = response.nextCursor
		}

		return allMessages
	}

	const { data: sessionMessagesMap, isLoading: isLoadingMessages } = useQuery({
		queryKey: ['chat-session-messages-for-search', debouncedSearchQuery.trim()],
		queryFn: async ({ signal }) => {
			if (!authorizedFetch || !debouncedSearchQuery.trim()) {
				return new Map<string, { messages: any[]; lastActivity: string }>()
			}

			const queryLower = debouncedSearchQuery.toLowerCase()
			const previousData = queryClient.getQueriesData<Map<string, { messages: any[]; lastActivity: string }>>({
				queryKey: ['chat-session-messages-for-search']
			})
			const messagesMap = new Map<string, { messages: any[]; lastActivity: string }>()

			for (const [, data] of previousData) {
				if (data) {
					for (const [sessionId, cached] of data) {
						const session = sessions.find((s) => s.sessionId === sessionId)
						if (session && cached.lastActivity === session.lastActivity) {
							messagesMap.set(sessionId, cached)
						}
					}
				}
			}

			const sessionsNeedingFetch = sessions
				.filter((session) => {
					const titleMatches = session.title.toLowerCase().includes(queryLower)
					if (titleMatches) {
						return false
					}

					const cached = messagesMap.get(session.sessionId)
					return !cached || cached.lastActivity !== session.lastActivity
				})
				.sort((a, b) => Date.parse(b.lastActivity) - Date.parse(a.lastActivity))

			const BATCH_SIZE = 25
			let batchIndex = 0

			while (batchIndex * BATCH_SIZE < sessionsNeedingFetch.length) {
				if (signal?.aborted) break

				const batch = sessionsNeedingFetch.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE)

				const fetchPromises = batch.map(async (session) => {
					if (signal?.aborted) return

					try {
						const messages = await fetchSessionMessagesForSearch(session.sessionId)
						if (!signal?.aborted) {
							messagesMap.set(session.sessionId, {
								messages,
								lastActivity: session.lastActivity
							})
						}
					} catch (error) {
						if (!signal?.aborted) {
							console.error(`Failed to fetch messages for session ${session.sessionId}:`, error)
						}
					}
				})

				await Promise.all(fetchPromises)

				batchIndex++
			}

			return messagesMap
		},
		enabled: !!debouncedSearchQuery.trim() && sessions.length > 0 && !!authorizedFetch,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		placeholderData: (previousData) => previousData
	})

	const filteredSessions = useMemo(() => {
		if (!debouncedSearchQuery.trim()) {
			return sessions
		}

		const queryLower = debouncedSearchQuery.toLowerCase()
		const messagesMap = sessionMessagesMap || new Map<string, { messages: any[]; lastActivity: string }>()

		return sessions.filter((session) => {
			if (session.title.toLowerCase().includes(queryLower)) {
				return true
			}

			const cached = messagesMap.get(session.sessionId)
			if (!cached) {
				return false
			}

			return cached.messages.some((message) => {
				const question = message.question || message.content || ''
				if (question.toLowerCase().includes(queryLower)) {
					return true
				}

				const answer = message.response?.answer || message.content || ''
				if (answer.toLowerCase().includes(queryLower)) {
					return true
				}

				return false
			})
		})
	}, [sessions, debouncedSearchQuery, sessionMessagesMap])

	const groupedSessions = useMemo(() => {
		return Object.entries(
			filteredSessions.reduce((acc: Record<string, Array<ChatSession>>, session) => {
				const groupName = getGroupName(session.lastActivity)
				acc[groupName] = [...(acc[groupName] || []), session]
				return acc
			}, {})
		).sort((a, b) => Date.parse(b[1][0].lastActivity) - Date.parse(a[1][0].lastActivity)) as Array<
			[string, Array<ChatSession>]
		>
	}, [filteredSessions])

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

				<div className="relative">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-1/2 left-2 -translate-y-1/2 text-[#666] dark:text-[#919296]"
					/>
					<input
						type="text"
						placeholder="Search chats..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full rounded-sm border border-[#e6e6e6] bg-(--bg-input) px-2 py-1.5 pl-8 text-xs leading-tight text-(--text-primary) placeholder:text-xs placeholder:leading-tight focus:border-(--old-blue) focus:ring-1 focus:ring-(--old-blue) focus:outline-none dark:border-[#222324] dark:placeholder:text-[#919296]"
					/>
					{searchQuery && (
						<button
							onClick={() => setSearchQuery('')}
							className="absolute top-1/2 right-2 -translate-y-1/2 text-[#666] hover:text-(--text-primary) dark:text-[#919296]"
						>
							<Icon name="x" height={12} width={12} />
						</button>
					)}
				</div>

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
				) : filteredSessions.length === 0 && debouncedSearchQuery.trim() && !isLoadingMessages ? (
					<p className="rounded-sm border border-dashed border-[#666]/50 p-4 text-center text-xs text-[#666] dark:border-[#919296]/50 dark:text-[#919296]">
						No chats match your search
					</p>
				) : (
					<>
						{debouncedSearchQuery.trim() && isLoadingMessages && (
							<div className="mb-2 flex items-center justify-center gap-1.5 rounded-sm border border-dashed border-[#666]/50 p-2 text-center text-xs text-[#666] dark:border-[#919296]/50 dark:text-[#919296]">
								<LoadingSpinner size={12} />
								<span>Searching messages...</span>
							</div>
						)}
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
					</>
				)}
			</div>
		</div>
	)
}
