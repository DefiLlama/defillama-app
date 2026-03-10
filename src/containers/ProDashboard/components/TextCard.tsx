import { Streamdown } from 'streamdown'
import type { TextConfig } from '../types'

interface TextCardProps {
	text: TextConfig
}

export function TextCard({ text }: TextCardProps) {
	return (
		<div className="flex thin-scrollbar flex-col gap-2 overflow-y-auto p-4">
			{text.title ? <h2 className="text-lg font-semibold text-(--text-primary)">{text.title}</h2> : null}

			<Streamdown
				mode="static"
				controls={false}
				className="text-sm"
				components={{
					h1: ({ children }) => <h3 className="m-0! text-xl font-bold text-(--text-primary)">{children}</h3>,
					h2: ({ children }) => <h4 className="m-0! text-lg font-semibold text-(--text-primary)">{children}</h4>,
					h3: ({ children }) => <h5 className="m-0! text-base font-medium text-(--text-primary)">{children}</h5>,
					code: ({ children }) => (
						<code className="m-0! thin-scrollbar overflow-x-auto rounded-sm bg-(--bg-tertiary) px-1 py-0.5 text-xs">
							{children}
						</code>
					),
					pre: ({ children }) => (
						<pre className="m-0! thin-scrollbar overflow-x-auto rounded-sm bg-(--bg-tertiary) p-2">{children}</pre>
					),
					blockquote: ({ children }) => (
						<blockquote className="m-0! thin-scrollbar overflow-x-auto border-l-3 border-(--old-blue) pl-2 text-(--text-label) italic">
							{children}
						</blockquote>
					),
					a: ({ children, href }) => (
						<a href={href} className="text-(--link-text) hover:underline" target="_blank" rel="noopener noreferrer">
							{children}
						</a>
					),
					strong: ({ children }) => <strong className="m-0! font-semibold text-(--text-primary)">{children}</strong>,
					em: ({ children }) => <em className="m-0! text-(--text-secondary) italic">{children}</em>
				}}
			>
				{text.content}
			</Streamdown>
		</div>
	)
}
