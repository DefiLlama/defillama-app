import { useRef, useEffect } from 'react'
import { ClippyInput } from './ClippyInput'
import { ClippyMessage } from './ClippyMessage'
import type { ClippyMessage as MessageType } from './types'

interface ClippyChatProps {
	messages: MessageType[]
	isLoading: boolean
	error: string | null
	onSend: (message: string) => void
	onClose: () => void
	onOpenInLlamaAI?: (query: string) => void
	entityName?: string
}

export function ClippyChat({
	messages,
	isLoading,
	error,
	onSend,
	onClose,
	onOpenInLlamaAI,
	entityName
}: ClippyChatProps) {
	const messagesEndRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	return (
		<div className="fixed right-4 bottom-20 z-40 flex h-[500px] w-[380px] flex-col rounded-2xl border border-(--divider) bg-white shadow-2xl dark:bg-[#1c1f2e]">
			<div className="flex items-center justify-between border-b border-(--divider) px-4 py-3">
				<div className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2172e5]">
						<span className="text-sm">🦙</span>
					</div>
					<div>
						<h3 className="text-sm font-semibold text-(--text1)">Clippy</h3>
						{entityName && <p className="text-xs text-(--text3)">Viewing {entityName}</p>}
					</div>
				</div>
				<button onClick={onClose} className="rounded-lg p-1 hover:bg-(--bg6)" aria-label="Close">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div className="flex-1 overflow-y-auto p-4">
				{messages.length === 0 ? (
					<div className="flex h-full flex-col items-center justify-center text-center">
						<span className="text-4xl">🦙</span>
						<p className="mt-2 text-sm text-(--text2)">Hi! Ask me anything about {entityName || 'this page'}.</p>
						<p className="mt-1 text-xs text-(--text3)">I can explain metrics, compare protocols, and more.</p>
					</div>
				) : (
					<div className="flex flex-col gap-3">
						{messages.map((msg) => (
							<ClippyMessage key={msg.id} message={msg} onOpenInLlamaAI={onOpenInLlamaAI} />
						))}
						{isLoading && (
							<div className="flex justify-start">
								<div className="rounded-2xl bg-(--bg6) px-4 py-3">
									<div className="flex gap-1">
										<div
											className="h-2 w-2 animate-bounce rounded-full bg-(--text3)"
											style={{ animationDelay: '0ms' }}
										/>
										<div
											className="h-2 w-2 animate-bounce rounded-full bg-(--text3)"
											style={{ animationDelay: '150ms' }}
										/>
										<div
											className="h-2 w-2 animate-bounce rounded-full bg-(--text3)"
											style={{ animationDelay: '300ms' }}
										/>
									</div>
								</div>
							</div>
						)}
						<div ref={messagesEndRef} />
					</div>
				)}

				{error && (
					<div className="mt-2 rounded-lg bg-red-100 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
						{error}
					</div>
				)}
			</div>

			<div className="border-t border-(--divider) p-3">
				<ClippyInput onSend={onSend} isLoading={isLoading} />
			</div>
		</div>
	)
}
