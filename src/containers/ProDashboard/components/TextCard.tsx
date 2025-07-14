import ReactMarkdown from 'react-markdown'
import { TextConfig } from '../types'
import { memo } from 'react'

interface TextCardProps {
	text: TextConfig
}

export const TextCard = memo(function TextCard({ text }: TextCardProps) {
	return (
		<div className="p-4 h-full flex flex-col">
			{text.title && (
				<div className="mb-3 shrink-0 pr-28">
					<h2 className="text-lg font-semibold pro-text1">{text.title}</h2>
				</div>
			)}

			<div className="overflow-y-auto thin-scrollbar h-[300px] flex-1">
				<div className="prose prose-invert prose-sm max-w-none pro-text1">
					<ReactMarkdown
						components={{
							h1: ({ children }) => <h1 className="text-xl font-bold mb-2 pro-text1">{children}</h1>,
							h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 pro-text1">{children}</h2>,
							h3: ({ children }) => <h3 className="text-base font-medium mb-1 pro-text1">{children}</h3>,
							p: ({ children }) => <p className="mb-2 pro-text2 leading-relaxed">{children}</p>,
							ul: ({ children }) => <ul className="list-disc list-inside mb-2 pro-text2">{children}</ul>,
							ol: ({ children }) => <ol className="list-decimal list-inside mb-2 pro-text2">{children}</ol>,
							li: ({ children }) => <li className="mb-1">{children}</li>,
							code: ({ children }) => (
								<code className="bg-(--bg3) px-1 py-0.5 rounded-sm text-xs font-mono pro-text1">{children}</code>
							),
							pre: ({ children }) => (
								<pre className="bg-(--bg3) p-3 rounded-sm mb-2 overflow-x-auto thin-scrollbar">{children}</pre>
							),
							blockquote: ({ children }) => (
								<blockquote className="border-l-4 border-(--primary1) pl-4 italic pro-text3 mb-2">
									{children}
								</blockquote>
							),
							a: ({ children, href }) => (
								<a
									href={href}
									className="text-(--primary1) hover:underline"
									target="_blank"
									rel="noopener noreferrer"
								>
									{children}
								</a>
							),
							strong: ({ children }) => <strong className="font-semibold pro-text1">{children}</strong>,
							em: ({ children }) => <em className="italic">{children}</em>
						}}
					>
						{text.content}
					</ReactMarkdown>
				</div>
			</div>
		</div>
	)
})
