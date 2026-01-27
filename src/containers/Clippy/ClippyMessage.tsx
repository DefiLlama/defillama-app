import type { ClippyMessage as MessageType } from './types'

interface ClippyMessageProps {
	message: MessageType
	onOpenInLlamaAI?: (query: string) => void
}

export function ClippyMessage({ message, onOpenInLlamaAI }: ClippyMessageProps) {
	const isUser = message.role === 'user'

	return (
		<div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
			<div
				className={`max-w-[85%] rounded-2xl px-4 py-2 ${
					isUser ? 'bg-[#2172e5] text-white' : 'bg-(--bg6) text-(--text1)'
				}`}
			>
				<p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

				{message.routeToLlamaAI && onOpenInLlamaAI && (
					<button
						onClick={() => onOpenInLlamaAI(message.routeToLlamaAI!.prefilledQuery)}
						className="mt-2 text-xs text-[#2172e5] underline hover:no-underline"
					>
						Open in LlamaAI →
					</button>
				)}
			</div>
		</div>
	)
}
