import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useChatHistory } from '../hooks/useChatHistory'
import { SessionItem } from './SessionItem'

interface ChatHistorySidebarProps {
	handleSidebarToggle: () => void
	currentSessionId: string | null
	onSessionSelect: (sessionId: string, data: { conversationHistory: any[]; pagination?: any }) => void
	onNewChat: () => void
}

export function ChatHistorySidebar({
	handleSidebarToggle,
	currentSessionId,
	onSessionSelect,
	onNewChat
}: ChatHistorySidebarProps) {
	const { user } = useAuthContext()
	const {
		sessions,
		isLoading,
		restoreSession,
		deleteSession,
		updateSessionTitle,
		isRestoringSession,
		isDeletingSession,
		isUpdatingTitle
	} = useChatHistory()

	const handleSessionClick = async (sessionId: string) => {
		if (sessionId === currentSessionId) return

		try {
			const result = await restoreSession(sessionId)
			onSessionSelect(sessionId, result)
		} catch (error) {
			console.error('Failed to restore session:', error)
		}
	}

	if (!user) return null

	return (
		<div className="thin-scrollbar relative flex h-full w-full max-w-[272px] flex-col gap-2 overflow-auto rounded-lg border border-[#e6e6e6] bg-(--cards-bg) p-4 lg:mr-2 dark:border-[#222324]">
			<div className="flex flex-nowrap items-center gap-2">
				<button
					onClick={onNewChat}
					className="flex flex-1 items-center justify-center gap-2 rounded-sm border border-(--old-blue) bg-(--old-blue)/10 px-2 py-0.75 text-xs text-(--old-blue)"
				>
					<Icon name="message-square-plus" height={16} width={16} />
					<span>New Chat</span>
				</button>
				<Tooltip
					content="Close Chat History"
					render={<button onClick={handleSidebarToggle} />}
					className="flex h-6 w-6 rotate-180 items-center justify-center gap-2 rounded-sm bg-(--old-blue)/10 text-(--old-blue)"
				>
					<Icon name="arrow-right-to-line" height={16} width={16} />
					<span className="sr-only">Close Chat History</span>
				</Tooltip>
			</div>

			<h1 className="dark:text-[#919296 my-2 text-xs text-[#666]">Chats</h1>

			{isLoading ? (
				<div className="flex items-center justify-center py-8">
					<div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
				</div>
			) : sessions.length === 0 ? (
				<p className="py-8 text-center text-xs">No chat history yet</p>
			) : (
				<>
					{sessions.map((session) => (
						<SessionItem
							key={session.sessionId}
							session={session}
							isActive={session.sessionId === currentSessionId}
							onClick={() => handleSessionClick(session.sessionId)}
							onDelete={() => deleteSession(session.sessionId)}
							onUpdateTitle={(title) => updateSessionTitle(session.sessionId, title)}
							isUpdating={isUpdatingTitle}
						/>
					))}
				</>
			)}

			{(isRestoringSession || isDeletingSession) && (
				<div className="absolute inset-0 flex items-center justify-center bg-(--cards-bg)/80">
					<div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
				</div>
			)}
		</div>
	)
}
