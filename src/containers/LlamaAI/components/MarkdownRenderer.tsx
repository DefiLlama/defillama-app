import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
	content: string
}

interface EntityLinkProps {
	href?: string
	children?: any
	node?: any
	[key: string]: any
}

function getEntityUrl(type: string, slug: string): string {
	switch (type) {
		case 'protocol':
		case 'subprotocol':
			return `/protocol/${slug}`
		case 'chain':
			return `/chain/${slug}`
		default:
			return `/${type}/${slug}`
	}
}

function getEntityIcon(type: string, slug: string): string {
	switch (type) {
		case 'protocol':
		case 'subprotocol':
			return `https://icons.llamao.fi/icons/protocols/${slug}?w=48&h=48`
		case 'chain':
			return `https://icons.llamao.fi/icons/chains/rsz_${slug}?w=48&h=48`
		default:
			return ''
	}
}

function EntityLinkRenderer({ href, children, node, ...props }: EntityLinkProps) {
	if (href?.startsWith('llama://')) {
		const [type, slug] = href.replace('llama://', '').split('/')

		if (!['protocol', 'subprotocol', 'chain'].includes(type)) {
			return <span>{children}</span>
		}

		const entityUrl = getEntityUrl(type, slug)
		const iconUrl = getEntityIcon(type, slug)

		return (
			<a
				href={entityUrl}
				className="inline items-center gap-1 text-(--link-text) hover:text-blue-800"
				onClick={(e) => {
					e.preventDefault()
					window.location.href = entityUrl
				}}
				{...props}
			>
				<img
					src={iconUrl}
					alt={children}
					className="mr-1 inline-block h-4 w-4 rounded-full"
					onError={(e) => {
						e.currentTarget.style.display = 'none'
					}}
				/>
				{children}
			</a>
		)
	}
	return (
		<a href={href} {...props}>
			{children}
		</a>
	)
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
	const partialLink = content.match(/\[([^\]]+)\]\(([^)]*?)$/)

	if (partialLink) {
		const [fullMatch, linkText] = partialLink
		const beforeLink = content.slice(0, -fullMatch.length)

		return (
			<div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-li:my-0 prose-ul:my-1 prose-ol:my-1 prose-a:no-underline prose-table:table-auto prose-table:border-collapse prose-th:border prose-th:border-[#e6e6e6] dark:prose-th:border-[#222324] prose-th:px-3 prose-th:py-2 prose-th:whitespace-nowrap prose-td:whitespace-nowrap prose-th:bg-(--app-bg) prose-td:border prose-td:border-[#e6e6e6] dark:prose-td:border-[#222324] prose-td:bg-white dark:prose-td:bg-[#181A1C] prose-td:px-3 prose-td:py-2 max-w-none overflow-x-auto leading-tight">
				<ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: EntityLinkRenderer }}>
					{beforeLink}
				</ReactMarkdown>
				<span className="text-(--link-text)">{linkText}</span>
			</div>
		)
	}

	return (
		<div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-li:my-0 prose-ul:my-1 prose-ol:my-1 prose-a:no-underline prose-table:table-auto prose-table:border-collapse prose-th:border prose-th:border-[#e6e6e6] dark:prose-th:border-[#222324] prose-th:px-3 prose-th:py-2 prose-th:whitespace-nowrap prose-td:whitespace-nowrap prose-th:bg-(--app-bg) prose-td:border prose-td:border-[#e6e6e6] dark:prose-td:border-[#222324] prose-td:bg-white dark:prose-td:bg-[#181A1C] prose-td:px-3 prose-td:py-2 max-w-none overflow-x-auto leading-tight">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					a: (props) => {
						if (!props.href && props.children) {
							const linkPattern = new RegExp(`\\[${props.children}\\]\\(([^)]+)\\)`)
							const match = content.match(linkPattern)
							if (match) {
								return EntityLinkRenderer({ ...props, href: match[1] })
							}
						}

						return EntityLinkRenderer(props)
					}
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	)
}
