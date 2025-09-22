import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
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
	const { sessions, isLoading } = useChatHistory()

	if (!user) return null

	return (
		<div className="relative flex h-full w-full max-w-[272px] animate-[slideInRight_0.2s_ease-out] flex-col rounded-lg border border-[#e6e6e6] bg-(--cards-bg) lg:mr-2 dark:border-[#222324]">
			<div className="flex flex-nowrap items-center gap-2 p-4 pb-0">
				<button
					onClick={onNewChat}
					className="flex flex-1 items-center justify-center gap-2 rounded-sm border border-(--old-blue) bg-(--old-blue)/10 px-2 py-0.75 text-xs text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
				>
					<Icon name="message-square-plus" height={16} width={16} />
					<span>New Chat</span>
				</button>
				<Tooltip
					content="Close Chat History"
					render={<button onClick={handleSidebarToggle} />}
					className="flex h-6 w-6 rotate-180 items-center justify-center gap-2 rounded-sm bg-(--old-blue)/10 text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
				>
					<Icon name="arrow-right-to-line" height={16} width={16} />
					<span className="sr-only">Close Chat History</span>
				</Tooltip>
			</div>

			<h1 className="p-4 pb-2 text-xs text-[#666] dark:text-[#919296]">Chats</h1>

			<div className="thin-scrollbar flex-1 overflow-auto p-4 pt-0">
				{isLoading ? (
					<div className="flex items-center justify-center rounded-sm border border-dashed border-[#666]/50 p-4 text-center text-xs text-[#666] dark:border-[#919296]/50 dark:text-[#919296]">
						<LoadingSpinner size={12} />
					</div>
				) : sessions.length === 0 ? (
					<p className="rounded-sm border border-dashed border-[#666]/50 p-4 text-center text-xs text-[#666] dark:border-[#919296]/50 dark:text-[#919296]">
						You don’t have any chats yet
					</p>
				) : (
					<div className="flex flex-col gap-0.5">
						{sessions.map((session) => (
							<SessionItem
								key={session.sessionId}
								session={session}
								isActive={session.sessionId === currentSessionId}
								onSessionSelect={onSessionSelect}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
