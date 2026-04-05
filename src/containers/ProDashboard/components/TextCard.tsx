import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import type { TextConfig } from '../types'

interface TextCardProps {
	text: TextConfig
	allowHtml?: boolean
}

const REMARK_PLUGINS = [[remarkGfm, { singleTilde: false }]] as any

export function TextCard({ text, allowHtml = false }: TextCardProps) {
	return (
		<div className="prose prose-sm flex thin-scrollbar max-w-none flex-col gap-2 overflow-y-auto p-4 prose-invert">
			{text.title ? <h2 className="text-lg font-semibold text-(--text-primary)">{text.title}</h2> : null}

			<ReactMarkdown
				remarkPlugins={REMARK_PLUGINS}
				rehypePlugins={allowHtml ? [rehypeRaw] : []}
				components={{
					h1: ({ children }) => <h3 className="m-0! text-xl font-bold text-(--text-primary)">{children}</h3>,
					h2: ({ children }) => <h4 className="m-0! text-lg font-semibold text-(--text-primary)">{children}</h4>,
					h3: ({ children }) => <h5 className="m-0! text-base font-medium text-(--text-primary)">{children}</h5>,
					p: ({ children }) => <p className="m-0! leading-relaxed text-(--text-secondary)">{children}</p>,
					ul: ({ children }) => <ul className="m-0! flex list-disc flex-col gap-1 pl-4">{children}</ul>,
					ol: ({ children }) => <ol className="m-0! flex list-decimal flex-col gap-1 pl-4">{children}</ol>,
					li: ({ children }) => <li className="m-0! text-(--text-secondary)">{children}</li>,
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
						<a
							href={href}
							className="m-0! text-(--link-text) hover:underline"
							target="_blank"
							rel="noopener noreferrer"
						>
							{children}
						</a>
					),
					strong: ({ children }) => <strong className="m-0! font-semibold text-(--text-primary)">{children}</strong>,
					em: ({ children }) => <em className="m-0! text-(--text-secondary) italic">{children}</em>,
					table: ({ children }) => (
						<div style={{ overflowX: 'auto' }}>
							<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>{children}</table>
						</div>
					),
					thead: ({ children }) => <thead>{children}</thead>,
					tbody: ({ children }) => <tbody>{children}</tbody>,
					tr: ({ children }) => <tr>{children}</tr>,
					th: ({ children }) => (
						<th
							style={{
								textAlign: 'left',
								padding: '8px 12px',
								borderBottom: '1px solid var(--cards-border)',
								fontWeight: 600,
								color: 'var(--text-primary)',
								whiteSpace: 'nowrap'
							}}
						>
							{children}
						</th>
					),
					td: ({ children }) => (
						<td
							style={{
								padding: '6px 12px',
								borderBottom: '1px solid var(--cards-border)',
								color: 'var(--text-secondary)'
							}}
						>
							{children}
						</td>
					)
				}}
			>
				{text.content}
			</ReactMarkdown>
		</div>
	)
}
