import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useChatHistory } from '../hooks/useChatHistory'
import { SessionItem } from './SessionItem'

interface ChatHistorySidebarProps {
	visible: boolean
	currentSessionId: string | null
	onSessionSelect: (sessionId: string, data: { conversationHistory: any[]; pagination?: any }) => void
	onNewChat: () => void
}

export function ChatHistorySidebar({ visible, currentSessionId, onSessionSelect, onNewChat }: ChatHistorySidebarProps) {
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
		<div
			className={`flex h-full max-h-screen flex-col border-r border-gray-200 bg-(--cards-bg) transition-transform duration-300 ease-in-out md:relative md:translate-x-0 dark:border-gray-700 ${
				visible ? 'translate-x-0' : '-translate-x-full md:hidden'
			} ${visible ? 'fixed inset-y-0 left-0 z-50 w-80 md:static md:z-auto md:w-auto' : ''}`}
		>
			<div className="border-b border-gray-200 p-4 dark:border-gray-700">
				<button
					onClick={onNewChat}
					className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
				>
					<Icon name="plus" height={16} width={16} />
					<span>New Chat</span>
				</button>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto p-4">
				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
					</div>
				) : sessions.length === 0 ? (
					<div className="py-8 text-center text-gray-500 dark:text-gray-400">
						<p className="text-sm">No chat history yet</p>
					</div>
				) : (
					<div className="space-y-2">
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
					</div>
				)}
			</div>

			{(isRestoringSession || isDeletingSession) && (
				<div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
				</div>
			)}
		</div>
	)
}
