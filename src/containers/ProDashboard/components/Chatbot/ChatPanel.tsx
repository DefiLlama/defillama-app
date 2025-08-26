import { useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { MessageItem } from './MessageItem'
import { ModelSelector } from './ModelSelector'
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
	selectedModel?: string
	onModelSelect: (modelId: string) => void
	onSendMessage: (message: string) => void
	onStopGeneration: () => void
}

export const ChatPanel = ({
	isOpen,
	onClose,
	messages,
	isTyping,
	isConnected,
	toolExecutionStatus,
	selectedModel,
	onModelSelect,
	onSendMessage,
	onStopGeneration
}: ChatPanelProps) => {
	const [inputValue, setInputValue] = useState('')
	const [isStopping, setIsStopping] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	const isStreaming = isTyping || isConnected || toolExecutionStatus?.isExecuting

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

	const handleStopGeneration = async () => {
		setIsStopping(true)
		try {
			await onStopGeneration()
		} catch (error) {
			console.error('Error stopping generation:', error)
		} finally {
			setIsStopping(false)
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			if (isStreaming) {
				handleStopGeneration()
			} else {
				handleSendMessage()
			}
		}

		if (e.key === 'Escape' && isStreaming) {
			e.preventDefault()
			handleStopGeneration()
		}
	}

	return (
		<>
			<div
				className={`fixed top-0 right-0 z-50 h-full w-[480px] transform shadow-xl transition-transform duration-300 ease-in-out ${
					isOpen ? 'translate-x-0' : 'translate-x-full'
				}`}
			>
				<div className="pro-glass flex h-full flex-col border-l border-(--form-control-border) bg-(--bg-glass) backdrop-blur">
					<div className="flex items-center justify-between border-b border-(--form-control-border) p-4">
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-(--primary)">
								<Icon name="sparkles" height={16} width={16} className="text-white" />
							</div>
							<div>
								<h3 className="text-lg font-semibold text-(--text-primary)">LlamaAI</h3>
								<p className="text-xs text-(--text-secondary)">{isConnected ? 'Streaming...' : ''}</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<ModelSelector
								selectedModel={selectedModel}
								onModelSelect={onModelSelect}
								disabled={isTyping || isConnected}
							/>
							<button
								onClick={onClose}
								className="pro-hover-bg rounded p-1 text-(--text-secondary) transition-colors"
								title="Close chat"
							>
								<Icon name="x" height={20} width={20} />
							</button>
						</div>
					</div>

					<div className="flex-1 space-y-4 overflow-y-auto p-4">
						{messages.length === 0 && (
							<div className="mt-8 text-center text-(--text-secondary)">
								<Icon name="sparkles" height={32} width={32} className="mx-auto mb-2 opacity-50" />
								<p>Ask me anything about your dashboard!</p>
								<p className="mt-2 text-xs">I can analyze charts, extract data, and provide insights.</p>
							</div>
						)}

						{messages.map((message) => (
							<MessageItem key={message.id} message={message} />
						))}

						{toolExecutionStatus?.isExecuting && <ToolExecutionStatus status={toolExecutionStatus} />}

						{isTyping && (
							<div className="flex items-center gap-2 text-(--text-secondary)">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-(--primary)">
									<Icon name="sparkles" height={12} width={12} className="text-white" />
								</div>
								<div className="flex items-center gap-1">
									<span className="text-sm">LlamaAI is thinking</span>
									<div className="flex gap-1">
										<div
											className="h-1 w-1 animate-bounce rounded-full bg-current"
											style={{ animationDelay: '0ms' }}
										></div>
										<div
											className="h-1 w-1 animate-bounce rounded-full bg-current"
											style={{ animationDelay: '150ms' }}
										></div>
										<div
											className="h-1 w-1 animate-bounce rounded-full bg-current"
											style={{ animationDelay: '300ms' }}
										></div>
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
								className="placeholder-text-(--text-secondary) flex-1 rounded border border-(--form-control-border) bg-(--bg-main) px-3 py-2 text-(--text-primary) focus:border-(--primary) focus:outline-none"
							/>
							{isStreaming ? (
								<button
									onClick={handleStopGeneration}
									disabled={isStopping}
									className={`rounded px-3 py-2 text-white transition-colors ${
										isStopping
											? 'cursor-not-allowed bg-(--text-secondary) opacity-70'
											: 'bg-red-500 hover:bg-red-600 focus:bg-red-600'
									}`}
									title={isStopping ? 'Stopping generation...' : 'Stop generation'}
									aria-label={isStopping ? 'Stopping generation...' : 'Stop generation'}
								>
									<Icon name="x" height={16} width={16} />
								</button>
							) : (
								<button
									onClick={handleSendMessage}
									disabled={!inputValue.trim()}
									className="rounded bg-(--primary) px-3 py-2 text-white transition-colors hover:bg-(--primary-hover) disabled:cursor-not-allowed disabled:opacity-50"
									title="Send message"
									aria-label="Send message"
								>
									<Icon name="chevron-right" height={16} width={16} />
								</button>
							)}
						</div>
						<p className="mt-2 text-xs text-(--text-secondary)">
							{isStreaming ? 'Press Enter or Escape to stop' : 'Press Enter to send, Shift+Enter for new line'}
						</p>
					</div>
				</div>
			</div>
		</>
	)
}
