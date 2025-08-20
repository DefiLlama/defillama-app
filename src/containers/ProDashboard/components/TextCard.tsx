import ReactMarkdown from 'react-markdown'
import { TextConfig } from '../types'
import { memo } from 'react'

interface TextCardProps {
	text: TextConfig
}

export const TextCard = memo(function TextCard({ text }: TextCardProps) {
	return (
		<div className="flex h-full flex-col p-4">
			{text.title && (
				<div className="mb-4 shrink-0 pr-28">
					<h2 className="pro-text1 text-lg font-semibold">{text.title}</h2>
				</div>
			)}

			<div className="thin-scrollbar h-[300px] flex-1 overflow-y-auto">
				<div className="prose prose-invert prose-sm pro-text1 max-w-none">
					<ReactMarkdown
						components={{
							h1: ({ children }) => <h1 className="pro-text1 mb-2 text-xl font-bold">{children}</h1>,
							h2: ({ children }) => <h2 className="pro-text1 mb-2 text-lg font-semibold">{children}</h2>,
							h3: ({ children }) => <h3 className="pro-text1 mb-1 text-base font-medium">{children}</h3>,
							p: ({ children }) => <p className="pro-text2 mb-2 leading-relaxed">{children}</p>,
							ul: ({ children }) => <ul className="pro-text2 mb-2 list-inside list-disc">{children}</ul>,
							ol: ({ children }) => <ol className="pro-text2 mb-2 list-inside list-decimal">{children}</ol>,
							li: ({ children }) => <li className="mb-1">{children}</li>,
							code: ({ children }) => (
								<code className="pro-text1 rounded-sm bg-(--bg-tertiary) px-1 py-0.5 font-mono text-xs">
									{children}
								</code>
							),
							pre: ({ children }) => (
								<pre className="thin-scrollbar mb-2 overflow-x-auto rounded-sm bg-(--bg-tertiary) p-3">{children}</pre>
							),
							blockquote: ({ children }) => (
								<blockquote className="pro-text3 mb-2 border-l-4 border-(--primary) pl-4 italic">{children}</blockquote>
							),
							a: ({ children, href }) => (
								<a href={href} className="text-(--primary) hover:underline" target="_blank" rel="noopener noreferrer">
									{children}
								</a>
							),
							strong: ({ children }) => <strong className="pro-text1 font-semibold">{children}</strong>,
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
