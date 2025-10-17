import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { TextConfig } from '../types'

interface TextCardProps {
	text: TextConfig
}

export const TextCard = memo(function TextCard({ text }: TextCardProps) {
	return (
		<div className="prose prose-invert prose-sm thin-scrollbar flex flex-col gap-2 overflow-y-auto p-4">
			{text.title && <h1 className="text-lg font-semibold text-(--text-primary)">{text.title}</h1>}

			<ReactMarkdown
				components={{
					h1: ({ children }) => <h1 className="text-xl font-bold text-(--text-primary)">{children}</h1>,
					h2: ({ children }) => <h2 className="text-lg font-semibold text-(--text-primary)">{children}</h2>,
					h3: ({ children }) => <h3 className="text-base font-medium text-(--text-primary)">{children}</h3>,
					p: ({ children }) => <p className="leading-relaxed text-(--text-secondary)">{children}</p>,
					ul: ({ children }) => <ul className="flex list-disc flex-col gap-1 pl-4">{children}</ul>,
					ol: ({ children }) => <ol className="flex list-decimal flex-col gap-1 pl-4">{children}</ol>,
					li: ({ children }) => <li className="text-(--text-secondary)">{children}</li>,
					code: ({ children }) => (
						<code className="thin-scrollbar overflow-x-auto rounded-sm bg-(--bg-tertiary) px-1 py-0.5 text-xs">
							{children}
						</code>
					),
					pre: ({ children }) => (
						<pre className="thin-scrollbar overflow-x-auto rounded-sm bg-(--bg-tertiary) p-2">{children}</pre>
					),
					blockquote: ({ children }) => (
						<blockquote className="thin-scrollbar overflow-x-auto border-l-3 border-(--old-blue) pl-2 text-(--text-label) italic">
							{children}
						</blockquote>
					),
					a: ({ children, href }) => (
						<a href={href} className="text-(--link-text) hover:underline" target="_blank" rel="noopener noreferrer">
							{children}
						</a>
					),
					strong: ({ children }) => <strong className="font-semibold text-(--text-primary)">{children}</strong>,
					em: ({ children }) => <em className="text-(--text-secondary) italic">{children}</em>
				}}
			>
				{text.content}
			</ReactMarkdown>
		</div>
	)
})
