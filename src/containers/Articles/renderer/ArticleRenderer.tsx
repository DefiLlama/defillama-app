import { common, createLowlight } from 'lowlight'
import Link from 'next/link'
import { createElement, useEffect, useState, type ReactNode } from 'react'
import { validateArticleChartConfig } from '../chartAdapters'
import { validateArticlePeoplePanel } from '../editor/peoplePanel'
import { validateEmbedConfig } from '../embedProviders'
import { createArticleEntityRef, isValidArticleEntityType } from '../entityLinks'
import { getTiptapNodeText } from '../extractors'
import type {
	ArticleCalloutTone,
	ArticleCitation,
	ArticleEntityType,
	LocalArticleDocument,
	TiptapJson,
	TiptapMark
} from '../types'
import { ArticleChartBlock } from './ArticleChartBlock'
import { ArticleEmbedBlock } from './ArticleEmbedBlock'
import { ArticleImageBlock } from './ArticleImageBlock'
import { ArticlePeoplePanelBlock } from './ArticlePeoplePanelBlock'
import { EntityPreviewLink } from './EntityPreviewLink'

const lowlight = createLowlight(common)

type RenderContext = {
	figureCount: { value: number }
}

function tableCellAttrs(node: TiptapJson) {
	const colspan = Number(node.attrs?.colspan)
	const rowspan = Number(node.attrs?.rowspan)
	const colwidthRaw = node.attrs?.colwidth
	const colwidth = Array.isArray(colwidthRaw)
		? colwidthRaw.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
		: null
	const style = colwidth && colwidth.length ? { width: `${colwidth[0]}px` } : undefined
	return {
		colSpan: Number.isFinite(colspan) && colspan > 1 ? colspan : undefined,
		rowSpan: Number.isFinite(rowspan) && rowspan > 1 ? rowspan : undefined,
		style
	}
}

function stringAttr(attrs: Record<string, unknown> | null | undefined, key: string) {
	const value = attrs?.[key]
	return typeof value === 'string' ? value : undefined
}

function headingSlug(text: string) {
	return (
		text
			.toLowerCase()
			.replace(/[^\w\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '') || 'section'
	)
}

type HastNode =
	| { type: 'text'; value: string }
	| { type: 'element'; tagName: string; properties?: { className?: string[] }; children: HastNode[] }
	| { type: 'root'; children: HastNode[] }

function hastToReact(node: HastNode, key: string): ReactNode {
	if (node.type === 'text') return node.value
	if (node.type === 'root') return node.children.map((c, i) => hastToReact(c, `${key}-${i}`))
	if (node.type === 'element') {
		const className = (node.properties?.className ?? []).join(' ') || undefined
		return createElement(
			node.tagName,
			{ key, className },
			node.children.map((c, i) => hastToReact(c, `${key}-${i}`))
		)
	}
	return null
}

function renderCodeBlock(node: TiptapJson, key: string) {
	const language = stringAttr(node.attrs, 'language') || 'plaintext'
	const code = getTiptapNodeText(node)
	let body: ReactNode = code
	if (language && language !== 'plaintext' && lowlight.registered(language)) {
		try {
			const tree = lowlight.highlight(language, code) as unknown as HastNode
			body = hastToReact(tree, `${key}-hl`)
		} catch {}
	}
	return (
		<pre key={key} className="hljs">
			<code className={`language-${language}`}>{body}</code>
		</pre>
	)
}

function applyMark(children: ReactNode, mark: TiptapMark, key: string) {
	if (mark.type === 'bold') return <strong key={key}>{children}</strong>
	if (mark.type === 'italic') return <em key={key}>{children}</em>
	if (mark.type === 'strike') return <s key={key}>{children}</s>
	if (mark.type === 'underline') return <u key={key}>{children}</u>
	if (mark.type === 'highlight')
		return (
			<mark key={key} className="rounded bg-[#fff3a3] px-0.5 text-black dark:bg-[#5a4a16] dark:text-[#fde9a0]">
				{children}
			</mark>
		)
	if (mark.type === 'code') return <code key={key}>{children}</code>
	if (mark.type === 'link') {
		const href = stringAttr(mark.attrs, 'href')
		if (!href) return children
		const sameTab = stringAttr(mark.attrs, 'target') === '_self'
		if (sameTab) {
			return (
				<a key={key} href={href}>
					{children}
				</a>
			)
		}
		return (
			<a key={key} href={href} target="_blank" rel="noreferrer noopener">
				{children}
			</a>
		)
	}
	if (mark.type === 'entityLink') {
		const entityType = stringAttr(mark.attrs, 'entityType')
		const slug = stringAttr(mark.attrs, 'slug')
		if (!entityType || !slug || !isValidArticleEntityType(entityType)) return children
		const entity = createArticleEntityRef({
			entityType: entityType as ArticleEntityType,
			slug,
			label: stringAttr(mark.attrs, 'label') || getTiptapNodeText({ type: 'text', text: String(children) }),
			route: stringAttr(mark.attrs, 'route')
		})
		const snapshot =
			mark.attrs && typeof mark.attrs === 'object' ? (mark.attrs as { snapshot?: unknown }).snapshot : null
		return (
			<EntityPreviewLink
				key={key}
				entity={entity}
				snapshot={
					snapshot && typeof snapshot === 'object'
						? (snapshot as Parameters<typeof EntityPreviewLink>[0]['snapshot'])
						: null
				}
			>
				{children}
			</EntityPreviewLink>
		)
	}
	return children
}

function renderInlineText(node: TiptapJson, key: string) {
	let children: ReactNode = node.text ?? ''
	for (const [index, mark] of (node.marks ?? []).entries()) {
		children = applyMark(children, mark, `${key}-mark-${index}`)
	}
	return <span key={key}>{children}</span>
}

function renderChildren(node: TiptapJson, key: string, ctx: RenderContext) {
	return (node.content ?? []).map((child, index) => renderNode(child, `${key}-${index}`, ctx))
}

function renderCitation(node: TiptapJson, key: string) {
	const citation: ArticleCitation = {
		id: stringAttr(node.attrs, 'id') || key,
		label: stringAttr(node.attrs, 'label') || stringAttr(node.attrs, 'id') || key,
		...(stringAttr(node.attrs, 'url') ? { url: stringAttr(node.attrs, 'url') } : {}),
		...(stringAttr(node.attrs, 'title') ? { title: stringAttr(node.attrs, 'title') } : {})
	}
	const className =
		'mx-0.5 inline-flex items-baseline rounded-[3px] border border-(--cards-border) bg-(--link-button) px-1 text-[11px] leading-4 text-(--link-text) no-underline'
	if (citation.url) {
		return (
			<a
				key={key}
				href={citation.url}
				target="_blank"
				rel="noreferrer noopener"
				title={citation.title}
				className={className}
			>
				[{citation.label}]
			</a>
		)
	}
	return (
		<span key={key} title={citation.title} className={className}>
			[{citation.label}]
		</span>
	)
}

function renderCallout(node: TiptapJson, key: string, ctx: RenderContext) {
	const tone = (stringAttr(node.attrs, 'tone') as ArticleCalloutTone | undefined) || 'note'
	if (tone === 'pullquote') {
		return (
			<aside
				key={key}
				className="article-pullquote my-8 border-y border-(--link-text)/30 px-2 py-6 text-center text-xl leading-snug font-medium text-(--text-primary) [&_p]:my-0"
			>
				{renderChildren(node, key, ctx)}
			</aside>
		)
	}
	const wrap =
		tone === 'warning'
			? 'border-[#d89b2a]/60 bg-[#fff8e6] text-[#4d3606] dark:bg-[#30230b] dark:text-[#f4d28e]'
			: tone === 'data'
				? 'border-(--link-text)/40 bg-(--link-button)'
				: 'border-(--cards-border) bg-(--cards-bg)'
	const toneText =
		tone === 'warning'
			? 'text-[#a17317] dark:text-[#f4d28e]'
			: tone === 'data'
				? 'text-(--link-text)'
				: 'text-(--text-tertiary)'
	return (
		<aside key={key} className={`my-6 rounded-md border p-4 ${wrap}`}>
			<div className={`mb-1.5 text-xs font-medium capitalize ${toneText}`}>{tone}</div>
			<div className="article-callout-body">{renderChildren(node, key, ctx)}</div>
		</aside>
	)
}

function renderTaskItem(node: TiptapJson, key: string, ctx: RenderContext) {
	const checked = !!node.attrs?.checked
	return (
		<li key={key} className="article-task-item not-prose flex items-start gap-2 pl-0" data-checked={checked}>
			<input type="checkbox" checked={checked} readOnly className="mt-1.5 h-3.5 w-3.5 shrink-0 accent-(--link-text)" />
			<div className={`min-w-0 flex-1 ${checked ? 'text-(--text-tertiary) line-through' : 'text-(--text-primary)'}`}>
				{renderChildren(node, key, ctx)}
			</div>
		</li>
	)
}

function renderNode(node: TiptapJson, key: string, ctx: RenderContext): ReactNode {
	if (node.type === 'text') return renderInlineText(node, key)
	if (node.type === 'hardBreak') return <br key={key} />
	if (node.type === 'doc') return <div key={key}>{renderChildren(node, key, ctx)}</div>
	if (node.type === 'paragraph') return <p key={key}>{renderChildren(node, key, ctx)}</p>
	if (node.type === 'heading') {
		const level = Number(node.attrs?.level) || 2
		const id = headingSlug(getTiptapNodeText(node))
		if (level === 3) {
			return (
				<h3 key={key} id={id}>
					{renderChildren(node, key, ctx)}
				</h3>
			)
		}
		if (level === 4) {
			return (
				<h4 key={key} id={id}>
					{renderChildren(node, key, ctx)}
				</h4>
			)
		}
		if (level === 5) {
			return (
				<h5 key={key} id={id}>
					{renderChildren(node, key, ctx)}
				</h5>
			)
		}
		if (level === 6) {
			return (
				<h6 key={key} id={id}>
					{renderChildren(node, key, ctx)}
				</h6>
			)
		}
		return (
			<h2 key={key} id={id}>
				{renderChildren(node, key, ctx)}
			</h2>
		)
	}
	if (node.type === 'bulletList') return <ul key={key}>{renderChildren(node, key, ctx)}</ul>
	if (node.type === 'orderedList') return <ol key={key}>{renderChildren(node, key, ctx)}</ol>
	if (node.type === 'taskList')
		return (
			<ul key={key} className="article-task-list grid list-none gap-1.5 pl-0">
				{renderChildren(node, key, ctx)}
			</ul>
		)
	if (node.type === 'taskItem') return renderTaskItem(node, key, ctx)
	if (node.type === 'listItem') return <li key={key}>{renderChildren(node, key, ctx)}</li>
	if (node.type === 'blockquote') return <blockquote key={key}>{renderChildren(node, key, ctx)}</blockquote>
	if (node.type === 'horizontalRule') return <hr key={key} />
	if (node.type === 'codeBlock') return renderCodeBlock(node, key)
	if (node.type === 'callout') return renderCallout(node, key, ctx)
	if (node.type === 'citation') return renderCitation(node, key)
	if (node.type === 'defillamaChart') {
		const config = validateArticleChartConfig(node.attrs?.config)
		if (!config) return null
		ctx.figureCount.value += 1
		return <ArticleChartBlock key={key} config={config} index={ctx.figureCount.value} />
	}
	if (node.type === 'articleEmbed') {
		const config = validateEmbedConfig(node.attrs?.config)
		if (!config) return null
		ctx.figureCount.value += 1
		return <ArticleEmbedBlock key={key} config={config} index={ctx.figureCount.value} />
	}
	if (node.type === 'articleImage') {
		return <ArticleImageBlock key={key} attrs={node.attrs as Parameters<typeof ArticleImageBlock>[0]['attrs']} />
	}
	if (node.type === 'articlePeoplePanel') {
		const config = validateArticlePeoplePanel(node.attrs?.config)
		if (!config) return null
		return <ArticlePeoplePanelBlock key={key} config={config} />
	}
	if (node.type === 'table') return renderTable(node, key, ctx)
	if (node.type === 'tableRow') return renderTableRow(node, key, ctx)
	if (node.type === 'tableHeader') {
		const { colSpan, rowSpan, style } = tableCellAttrs(node)
		return (
			<th key={key} colSpan={colSpan} rowSpan={rowSpan} style={style}>
				{renderChildren(node, key, ctx)}
			</th>
		)
	}
	if (node.type === 'tableCell') {
		const { colSpan, rowSpan, style } = tableCellAttrs(node)
		return (
			<td key={key} colSpan={colSpan} rowSpan={rowSpan} style={style}>
				{renderChildren(node, key, ctx)}
			</td>
		)
	}
	return <div key={key}>{renderChildren(node, key, ctx)}</div>
}

function renderTable(node: TiptapJson, key: string, ctx: RenderContext) {
	const rows = node.content ?? []
	const headerRows: TiptapJson[] = []
	const bodyRows: TiptapJson[] = []
	let inHeader = true
	for (const row of rows) {
		if (row.type !== 'tableRow') continue
		const cells = row.content ?? []
		const allHeader = cells.length > 0 && cells.every((c) => c.type === 'tableHeader')
		if (inHeader && allHeader) headerRows.push(row)
		else {
			inHeader = false
			bodyRows.push(row)
		}
	}
	return (
		<div key={key} className="article-table-wrap not-prose my-6 overflow-x-auto">
			<table className="article-table w-full border-collapse text-sm">
				{headerRows.length ? (
					<thead className="bg-(--app-bg)">
						{headerRows.map((row, i) => renderNode(row, `${key}-thead-${i}`, ctx))}
					</thead>
				) : null}
				<tbody>{bodyRows.map((row, i) => renderNode(row, `${key}-tbody-${i}`, ctx))}</tbody>
			</table>
		</div>
	)
}

function renderTableRow(node: TiptapJson, key: string, ctx: RenderContext) {
	return (
		<tr key={key} className="border-b border-(--cards-border) last:border-b-0">
			{renderChildren(node, key, ctx)}
		</tr>
	)
}

function formatHeaderDate(iso: string | null | undefined) {
	if (!iso) return null
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return null
	return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

type TocEntry = { id: string; text: string; level: number }

function collectToc(node: TiptapJson | null | undefined, out: TocEntry[]) {
	if (!node) return
	if (node.type === 'heading') {
		const level = Number(node.attrs?.level) || 2
		if (level === 2 || level === 3) {
			const text = getTiptapNodeText(node).trim()
			if (text) out.push({ id: headingSlug(text), text, level })
		}
	}
	for (const child of node.content ?? []) collectToc(child, out)
}

function readingMinutes(plainText: string) {
	const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0
	return Math.max(1, Math.ceil(words / 220))
}

function useActiveHeading(toc: TocEntry[]): [string | null, (id: string) => void] {
	const [active, setActive] = useState<string | null>(toc[0]?.id ?? null)

	useEffect(() => {
		if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return
		if (!toc.length) return
		const ids = toc.map((t) => t.id)
		const visible = new Set<string>()
		const observer = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					const id = (e.target as HTMLElement).id
					if (e.isIntersecting) visible.add(id)
					else visible.delete(id)
				}
				const first = ids.find((id) => visible.has(id))
				if (first) setActive(first)
			},
			{ rootMargin: '-88px 0px -40% 0px', threshold: 0 }
		)
		for (const id of ids) {
			const el = document.getElementById(id)
			if (el) observer.observe(el)
		}
		return () => observer.disconnect()
	}, [toc])

	useEffect(() => {
		if (typeof window === 'undefined') return
		const onHash = () => {
			const id = window.location.hash.slice(1)
			if (id && toc.some((t) => t.id === id)) setActive(id)
		}
		onHash()
		window.addEventListener('hashchange', onHash)
		return () => window.removeEventListener('hashchange', onHash)
	}, [toc])

	return [active, setActive]
}

function ArticleToc({ toc }: { toc: TocEntry[] }) {
	const [active, setActive] = useActiveHeading(toc)
	return (
		<aside className="hidden lg:block">
			<nav className="sticky top-24 grid gap-3">
				<div className="font-jetbrains text-[10px] font-medium tracking-[0.22em] text-(--text-tertiary) uppercase">
					On this page
				</div>
				<ul className="grid gap-0.5 border-l border-(--cards-border)">
					{toc.map((entry) => {
						const isActive = active === entry.id
						const isSub = entry.level === 3
						return (
							<li key={entry.id} className="relative">
								<a
									href={`#${entry.id}`}
									onClick={() => setActive(entry.id)}
									className={`block truncate py-1.5 pr-2 transition-colors ${
										isSub ? 'pl-7 text-[13px]' : 'pl-4 text-[13.5px]'
									} ${
										isActive
											? 'font-medium text-(--text-primary)'
											: 'text-(--text-secondary) hover:text-(--text-primary)'
									}`}
								>
									{entry.text}
								</a>
								{isActive ? (
									<span
										aria-hidden
										className={`absolute top-1/2 -ml-px h-5 w-0.5 -translate-y-1/2 rounded-full bg-(--link-text) ${
											isSub ? 'left-0' : 'left-0'
										}`}
									/>
								) : null}
							</li>
						)
					})}
				</ul>
			</nav>
		</aside>
	)
}

export function ArticleRenderer({ article }: { article: LocalArticleDocument }) {
	const publishedLabel =
		article.status === 'published' && article.publishedAt
			? formatHeaderDate(article.publishedAt)
			: (formatHeaderDate(article.updatedAt) ?? 'Draft')
	const ctx: RenderContext = { figureCount: { value: 0 } }

	const toc: TocEntry[] = []
	collectToc(article.contentJson, toc)
	const minutes = readingMinutes(article.plainText || '')

	return (
		<div className="article-page animate-fadein mx-auto grid w-full max-w-[1180px] gap-10 px-4 pb-24 sm:px-6 lg:grid-cols-[minmax(0,760px)_220px]">
			<article className="article-published min-w-0">
				<header className="grid gap-4 pt-10 pb-8">
					<div className="flex flex-wrap items-center gap-2 text-xs text-(--text-tertiary)">
						<span>{publishedLabel}</span>
						<span aria-hidden>·</span>
						<span className="capitalize">{article.status}</span>
						<span aria-hidden>·</span>
						<span>{minutes} min read</span>
					</div>
					<h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-(--text-primary) md:text-5xl">
						{article.title}
					</h1>
					{article.subtitle ? <p className="text-lg leading-snug text-(--text-secondary)">{article.subtitle}</p> : null}
					{article.author ? (
						(() => {
							const ownerLink = article.authorProfile ? (
								<Link
									key={article.authorProfile.id}
									href={`/research/authors/${article.authorProfile.slug}`}
									className="text-sm text-(--text-primary) hover:text-(--link-text)"
								>
									{article.author}
								</Link>
							) : (
								<span key="owner" className="text-sm text-(--text-primary)">
									{article.author}
								</span>
							)
							const coAuthorLinks = (article.coAuthors ?? []).map((profile) => (
								<Link
									key={profile.id}
									href={`/research/authors/${profile.slug}`}
									className="text-sm text-(--text-primary) hover:text-(--link-text)"
								>
									{profile.displayName}
								</Link>
							))
							const links = [ownerLink, ...coAuthorLinks]
							const avatars = [
								{ key: 'owner', label: article.author },
								...(article.coAuthors ?? []).map((p) => ({ key: p.id, label: p.displayName }))
							]
							return (
								<div className="mt-2 flex flex-wrap items-center gap-2 border-t border-(--cards-border) pt-3 text-xs text-(--text-tertiary)">
									<div className="flex -space-x-2">
										{avatars.map((entry) => (
											<span
												key={entry.key}
												className="flex h-7 w-7 items-center justify-center rounded-full border border-(--cards-border) bg-(--cards-bg) text-[10px] font-medium text-(--text-secondary)"
												title={entry.label}
											>
												{entry.label.slice(0, 2).toUpperCase()}
											</span>
										))}
									</div>
									<span className="flex flex-wrap items-center gap-1">
										<span>By</span>
										{links.map((node, index) => (
											<span key={index} className="flex items-center gap-1">
												{node}
												{index < links.length - 2 ? <span>,</span> : null}
												{index === links.length - 2 ? <span>and</span> : null}
											</span>
										))}
									</span>
								</div>
							)
						})()
					) : null}
				</header>

				{article.coverImage
					? (() => {
							const cover = article.coverImage
							const headline = (cover.headline ?? '').trim()
							const caption = (cover.caption ?? '').trim()
							const credit = (cover.credit ?? '').trim()
							const copyright = (cover.copyright ?? '').trim()
							const metaParts = [credit ? `Credit: ${credit}` : '', copyright ? `© ${copyright}` : ''].filter(Boolean)
							const hasMeta = headline || caption || metaParts.length > 0
							return (
								<figure className="mb-10 overflow-hidden rounded-md border border-(--cards-border)">
									<img src={cover.url} alt={cover.alt || ''} className="max-h-[440px] w-full object-cover" />
									{hasMeta ? (
										<figcaption className="grid gap-1 border-t border-(--cards-border) bg-(--cards-bg) px-4 py-2 text-xs text-(--text-tertiary)">
											{headline ? <span className="font-medium text-(--text-secondary)">{headline}</span> : null}
											{caption ? <span>{caption}</span> : null}
											{metaParts.length > 0 ? (
												<span className="text-(--text-tertiary)/80">{metaParts.join(' · ')}</span>
											) : null}
										</figcaption>
									) : null}
								</figure>
							)
						})()
					: null}

				<div className="article-prose [overflow-wrap:anywhere] break-words">
					<div className="prose max-w-none prose-neutral dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-10 prose-h2:mb-3 prose-h2:text-2xl prose-h3:mt-7 prose-h3:mb-2 prose-h3:text-lg prose-p:leading-[1.65] prose-a:font-medium prose-a:text-(--link-text) prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-2 prose-blockquote:border-(--link-text) prose-blockquote:bg-transparent prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:text-(--text-secondary) prose-blockquote:not-italic prose-strong:text-(--text-primary) prose-code:rounded prose-code:bg-(--link-button) prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.92em] prose-code:text-(--link-text) prose-code:before:hidden prose-code:after:hidden prose-pre:border prose-pre:border-(--cards-border) prose-pre:bg-(--cards-bg) prose-pre:text-(--text-primary) prose-li:my-1 prose-hr:border-(--cards-border) [&_.article-table_p]:my-0 [&_.article-table_td]:border [&_.article-table_td]:border-(--cards-border) [&_.article-table_td]:px-3 [&_.article-table_td]:py-2 [&_.article-table_td]:align-top [&_.article-table_td]:text-(--text-secondary) [&_.article-table_th]:border [&_.article-table_th]:border-(--cards-border) [&_.article-table_th]:bg-(--app-bg) [&_.article-table_th]:px-3 [&_.article-table_th]:py-2 [&_.article-table_th]:text-left [&_.article-table_th]:font-semibold [&_.article-table_th]:text-(--text-primary) [&_li>p]:my-0 [&_li>p]:leading-[1.55]">
						{renderNode(article.contentJson, 'article-root', ctx)}
					</div>
				</div>
			</article>

			{toc.length > 1 ? <ArticleToc toc={toc} /> : null}
		</div>
	)
}
