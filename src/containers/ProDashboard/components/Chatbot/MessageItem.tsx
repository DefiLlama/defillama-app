import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Icon } from '~/components/Icon'
import type { ChatMessage } from './ChatPanel'

interface MessageItemProps {
	message: ChatMessage
}

export const MessageItem = memo(function MessageItem({ message }: MessageItemProps) {
	const isUser = message.role === 'user'
	const timestamp = new Date(message.timestamp).toLocaleTimeString([], { 
		hour: '2-digit', 
		minute: '2-digit' 
	})

	return (
		<div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
			<div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
				isUser ? 'bg-(--bg-tertiary)' : 'bg-(--primary)'
			}`}>
				{isUser ? (
					<Icon name="users" height={16} width={16} className="text-(--text-primary)" />
				) : (
					<Icon name="sparkles" height={16} width={16} className="text-white" />
				)}
			</div>

			<div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
				<div className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm ${
					isUser 
						? 'bg-(--primary) text-white shadow-sm' 
						: 'bg-(--bg-secondary) border border-(--form-control-border) text-(--text-primary) shadow-sm'
				}`}>
					<ReactMarkdown
						components={{
							p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
							
							code: ({ children, className }) => {
								const isBlock = className?.includes('language-')
								return isBlock ? (
									<code className="block bg-gray-500 bg-opacity-20 p-2 rounded text-xs font-mono overflow-x-auto whitespace-pre">
										{children}
									</code>
								) : (
									<code className="bg-gray-500 bg-opacity-20 px-1 py-0.5 rounded text-xs font-mono">
										{children}
									</code>
								)
							},
							
							pre: ({ children }) => <div className="my-2">{children}</div>,
							
							ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
							ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
							li: ({ children }) => <li className="text-sm">{children}</li>,
							
							h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
							h2: ({ children }) => <h2 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h2>,
							h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
							
							a: ({ children, href }) => (
								<a 
									href={href} 
									target="_blank" 
									rel="noopener noreferrer"
									className="underline hover:no-underline"
								>
									{children}
								</a>
							),
							
							blockquote: ({ children }) => (
								<blockquote className="border-l-2 border-gray-400 pl-3 my-2 italic opacity-75">
									{children}
								</blockquote>
							),
							
							table: ({ children }) => (
								<div className="overflow-x-auto my-2">
									<table className="text-xs border-collapse">{children}</table>
								</div>
							),
							th: ({ children }) => (
								<th className="border border-gray-400 px-2 py-1 bg-gray-500 bg-opacity-20 font-semibold text-left">
									{children}
								</th>
							),
							td: ({ children }) => (
								<td className="border border-gray-400 px-2 py-1">
									{children}
								</td>
							),
						}}
					>
						{message.content}
					</ReactMarkdown>

					{message.content.includes('data:image/png;base64,') && (
						<div className="mt-2 space-y-2">
							{message.content.match(/data:image\/png;base64,[^)]+/g)?.map((imageData, index) => (
								<img 
									key={index}
									src={imageData} 
									alt={`Chart ${index + 1}`}
									className="max-w-full rounded border border-(--form-control-border)"
								/>
							))}
						</div>
					)}
				</div>

				<div className={`mt-1 text-xs text-(--text-secondary) ${isUser ? 'text-right' : 'text-left'}`}>
					{timestamp}
				</div>
			</div>
		</div>
	)
})