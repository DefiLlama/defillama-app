import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

const REMARK_PLUGINS: import('unified').PluggableList = [[remarkGfm, { singleTilde: false }]]
const REHYPE_PLUGINS: import('unified').PluggableList = [rehypeSanitize]

const components: Components = {
	a: ({ node: _node, ...props }: any) => <a {...props} target="_blank" rel="noreferrer noopener" />,
	table: ({ node: _node, children, ...props }: any) => (
		<div className="overflow-x-auto">
			<table {...props} className={`w-full border-collapse text-sm ${props.className ?? ''}`}>
				{children}
			</table>
		</div>
	),
	th: ({ node: _node, children, ...props }: any) => (
		<th
			{...props}
			className={`border border-(--divider) bg-(--app-bg) px-2 py-1.5 text-left font-semibold ${props.className ?? ''}`}
		>
			{children}
		</th>
	),
	td: ({ node: _node, children, ...props }: any) => (
		<td {...props} className={`border border-(--divider) px-2 py-1.5 ${props.className ?? ''}`}>
			{children}
		</td>
	),
	ul: ({ node: _node, children, ...props }: any) => (
		<ul {...props} className={`list-disc pl-5 ${props.className ?? ''}`}>
			{children}
		</ul>
	),
	ol: ({ node: _node, children, ...props }: any) => (
		<ol {...props} className={`list-decimal pl-5 ${props.className ?? ''}`}>
			{children}
		</ol>
	),
	code: ({ node: _node, children, className, ...props }: any) => {
		const isBlock = typeof className === 'string' && className.includes('language-')
		if (isBlock) {
			return (
				<pre className="thin-scrollbar overflow-x-auto rounded-md border border-(--divider) bg-(--app-bg) p-2 font-mono text-[12px]">
					<code {...props} className={className}>
						{children}
					</code>
				</pre>
			)
		}
		return (
			<code {...props} className={`rounded-sm bg-(--app-bg) px-1 py-px font-mono text-[12px] ${className ?? ''}`}>
				{children}
			</code>
		)
	}
}

export function NotebookMarkdown({ content }: { content: string }) {
	if (!content.trim()) {
		return <div className="text-xs text-(--text-tertiary) italic">Empty markdown cell</div>
	}
	return (
		<div className="prose prose-sm max-w-none text-(--text-primary) dark:prose-invert">
			<ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS} components={components}>
				{content}
			</ReactMarkdown>
		</div>
	)
}
