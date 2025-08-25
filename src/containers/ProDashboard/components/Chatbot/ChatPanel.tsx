import { useRef, useEffect, useState } from 'react'
import { Icon } from '~/components/Icon'
import { MessageItem } from './MessageItem'
import { ToolExecutionStatus } from './ToolExecutionStatus'

export interface ChatMessage {
	id: string
	role: 'user' | 'assistant'
	content: string
	timestamp: string
	isStreaming?: boolean
}

export interface ToolExecutionStatus {
	isExecuting: boolean
	toolName?: string
	description?: string
}

interface ChatPanelProps {
	isOpen: boolean
	onClose: () => void
	messages: ChatMessage[]
	isTyping: boolean
	isConnected: boolean
	toolExecutionStatus: ToolExecutionStatus | null
	onSendMessage: (message: string) => void
}

export const ChatPanel = ({
	isOpen,
	onClose,
	messages,
	isTyping,
	isConnected,
	toolExecutionStatus,
	onSendMessage
}: ChatPanelProps) => {
	const [inputValue, setInputValue] = useState('')
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages, isTyping, toolExecutionStatus])

	useEffect(() => {
		if (isOpen && inputRef.current) {
			inputRef.current.focus()
		}
	}, [isOpen])

	const handleSendMessage = () => {
		if (inputValue.trim()) {
			onSendMessage(inputValue.trim())
			setInputValue('')
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSendMessage()
		}
	}

	return (
		<>
			<div
				className={`fixed top-0 right-0 h-full z-50 w-96 transform transition-transform duration-300 ease-in-out shadow-xl ${
					isOpen ? 'translate-x-0' : 'translate-x-full'
				}`}
			>
				<div className="pro-glass flex h-full flex-col border-l border-(--form-control-border) bg-(--bg-glass) backdrop-blur">
					<div className="flex items-center justify-between border-b border-(--form-control-border) p-4">
						<div className="flex items-center gap-2">
							<div className="h-8 w-8 rounded-full bg-(--primary) flex items-center justify-center">
								<Icon name="sparkles" height={16} width={16} className="text-white" />
							</div>
							<div>
								<h3 className="text-lg font-semibold text-(--text-primary)">LlamaAI</h3>
								<p className="text-xs text-(--text-secondary)">
									{isConnected ? 'Streaming...' : ''}
								</p>
							</div>
						</div>
						<button
							onClick={onClose}
							className="pro-hover-bg rounded p-1 text-(--text-secondary) transition-colors"
							title="Close chat"
						>
							<Icon name="x" height={20} width={20} />
						</button>
					</div>

					<div className="flex-1 overflow-y-auto p-4 space-y-4">
						{messages.length === 0 && (
							<div className="text-center text-(--text-secondary) mt-8">
								<Icon name="sparkles" height={32} width={32} className="mx-auto mb-2 opacity-50" />
								<p>Ask me anything about your dashboard!</p>
								<p className="text-xs mt-2">I can analyze charts, extract data, and provide insights.</p>
							</div>
						)}

						{messages.map((message) => (
							<MessageItem key={message.id} message={message} />
						))}

						{toolExecutionStatus?.isExecuting && (
							<ToolExecutionStatus status={toolExecutionStatus} />
						)}

						{isTyping && (
							<div className="flex items-center gap-2 text-(--text-secondary)">
								<div className="h-6 w-6 rounded-full bg-(--primary) flex items-center justify-center">
									<Icon name="sparkles" height={12} width={12} className="text-white" />
								</div>
								<div className="flex items-center gap-1">
									<span className="text-sm">LlamaAI is thinking</span>
									<div className="flex gap-1">
										<div className="h-1 w-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }}></div>
										<div className="h-1 w-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }}></div>
										<div className="h-1 w-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }}></div>
									</div>
								</div>
							</div>
						)}

						<div ref={messagesEndRef} />
					</div>

					<div className="border-t border-(--form-control-border) p-4">
						<div className="flex gap-2">
							<input
								ref={inputRef}
								type="text"
								value={inputValue}
								onChange={(e) => setInputValue(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Ask about your dashboard..."
								className="flex-1 rounded border border-(--form-control-border) bg-(--bg-main) px-3 py-2 text-(--text-primary) placeholder-text-(--text-secondary) focus:border-(--primary) focus:outline-none"
							/>
							<button
								onClick={handleSendMessage}
								disabled={!inputValue.trim()}
								className="rounded bg-(--primary) px-3 py-2 text-white transition-colors hover:bg-(--primary-hover) disabled:cursor-not-allowed disabled:opacity-50"
							>
								<Icon name="chevron-right" height={16} width={16} />
							</button>
						</div>
						<p className="text-xs text-(--text-secondary) mt-2">
							Press Enter to send, Shift+Enter for new line
						</p>
					</div>
				</div>
			</div>
		</>
	)
}