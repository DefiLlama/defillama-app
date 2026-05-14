import { common, createLowlight } from 'lowlight'
import Link from 'next/link'
import { createElement, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Icon } from '~/components/Icon'
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
import { ARTICLE_SECTION_LABELS, ARTICLE_SECTION_SLUGS } from '../types'
import { ArticleChartBlock } from './ArticleChartBlock'
import { ArticleEmbedBlock } from './ArticleEmbedBlock'
import { ArticleImageBanner } from './ArticleImageBanner'
import { ArticleImageBannerHorizontal } from './ArticleImageBannerHorizontal'
import { ArticleImageBlock } from './ArticleImageBlock'
import { ArticlePeoplePanelBlock } from './ArticlePeoplePanelBlock'
import { ArticleQAAnswer, ArticleQABlock, ArticleQAQuestion } from './ArticleQABlock'
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

function horizontalBannerSlot(articleId: string, blockCount: number): number {
	if (blockCount < 2) return blockCount
	let hash = 0
	for (let i = 0; i < articleId.length; i++) {
		hash = ((hash << 5) - hash + articleId.charCodeAt(i)) | 0
	}
	const maxSlot = Math.min(3, blockCount)
	return (Math.abs(hash) % maxSlot) + 1
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
	if (node.type === 'qa') {
		const questionNode = (node.content ?? []).find((child) => child?.type === 'qaQuestion')
		const questionText = questionNode ? getTiptapNodeText(questionNode).trim() : ''
		const qaId = questionText ? `qa-${headingSlug(questionText)}` : undefined
		return (
			<ArticleQABlock key={key} id={qaId}>
				{renderChildren(node, key, ctx)}
			</ArticleQABlock>
		)
	}
	if (node.type === 'qaQuestion') {
		return <ArticleQAQuestion key={key}>{renderChildren(node, key, ctx)}</ArticleQAQuestion>
	}
	if (node.type === 'qaAnswer') {
		return <ArticleQAAnswer key={key}>{renderChildren(node, key, ctx)}</ArticleQAAnswer>
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
	const day = date.getDate()
	const month = date.toLocaleString(undefined, { month: 'long' })
	const year = date.getFullYear()
	let hours = date.getHours()
	const ampm = hours >= 12 ? 'PM' : 'AM'
	hours = hours % 12 || 12
	const hh = hours.toString().padStart(2, '0')
	const mm = date.getMinutes().toString().padStart(2, '0')
	return `${day} ${month} ${year} at ${hh}:${mm} ${ampm}`
}

function MetaChip({ children }: { children: ReactNode }) {
	return (
		<span className="inline-flex items-center rounded-[3px] bg-(--link-text) px-2 py-[3px] text-[10px] leading-none font-semibold tracking-tight whitespace-nowrap text-white">
			{children}
		</span>
	)
}

type TocEntry = { id: string; text: string; level: number }
type TocGroup = { id: string; text: string; children: TocEntry[] }

function groupToc(toc: TocEntry[]): TocGroup[] {
	const groups: TocGroup[] = []
	let current: TocGroup | null = null
	for (const entry of toc) {
		if (entry.level === 2) {
			current = { id: entry.id, text: entry.text, children: [] }
			groups.push(current)
		} else if (entry.level === 3) {
			if (current) current.children.push(entry)
			else groups.push({ id: entry.id, text: entry.text, children: [] })
		}
	}
	return groups
}

function collectToc(node: TiptapJson | null | undefined, out: TocEntry[]) {
	if (!node) return
	if (node.type === 'heading') {
		const level = Number(node.attrs?.level) || 2
		if (level === 2 || level === 3) {
			const text = getTiptapNodeText(node).trim()
			if (text) out.push({ id: headingSlug(text), text, level })
		}
	}
	if (node.type === 'qa') {
		const questionNode = (node.content ?? []).find((child) => child?.type === 'qaQuestion')
		const text = questionNode ? getTiptapNodeText(questionNode).trim() : ''
		if (text) {
			const qIndex = out.filter((entry) => entry.id.startsWith('qa-')).length + 1
			out.push({ id: `qa-${headingSlug(text)}`, text: `Q${qIndex}. ${text}`, level: 3 })
		}
		return
	}
	for (const child of node.content ?? []) collectToc(child, out)
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

function ActivePill() {
	return (
		<span
			aria-hidden
			className="pointer-events-none absolute top-1/2 right-0 h-5 w-1 -translate-y-1/2 rounded-[2px] bg-(--text-tertiary)"
		/>
	)
}

function useReadingProgress() {
	const [progress, setProgress] = useState(0)
	useEffect(() => {
		if (typeof window === 'undefined') return
		let raf = 0
		const update = () => {
			const doc = document.documentElement
			const max = doc.scrollHeight - window.innerHeight
			const next = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
			setProgress(next)
		}
		const onScroll = () => {
			cancelAnimationFrame(raf)
			raf = requestAnimationFrame(update)
		}
		update()
		window.addEventListener('scroll', onScroll, { passive: true })
		window.addEventListener('resize', onScroll)
		return () => {
			cancelAnimationFrame(raf)
			window.removeEventListener('scroll', onScroll)
			window.removeEventListener('resize', onScroll)
		}
	}, [])
	return progress
}

function CompactTocBar({ toc, groups, active }: { toc: TocEntry[]; groups: TocGroup[]; active: string | null }) {
	const progress = useReadingProgress()
	const currentGroupIndex = useMemo(() => {
		if (!active) return 0
		const idx = groups.findIndex((g) => g.id === active || g.children.some((c) => c.id === active))
		return idx < 0 ? 0 : idx
	}, [active, groups])
	const currentEntry = useMemo(() => {
		if (!active) return groups[0] ?? toc[0] ?? null
		return toc.find((t) => t.id === active) ?? groups[currentGroupIndex] ?? toc[0] ?? null
	}, [active, toc, groups, currentGroupIndex])
	const totalGroups = Math.max(groups.length, 1)
	const displayNumber = String(Math.min(currentGroupIndex + 1, totalGroups)).padStart(2, '0')
	const displayTotal = String(totalGroups).padStart(2, '0')
	const pct = Math.round(progress * 100)

	const onJumpToTop = () => {
		if (typeof window === 'undefined') return
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	return (
		<button
			type="button"
			onClick={onJumpToTop}
			aria-label={`Currently reading: ${currentEntry?.text ?? 'article'}. Return to top of article.`}
			className="group relative flex w-full flex-col gap-3 border-y border-(--cards-border) py-3.5 text-left transition-colors hover:bg-(--cards-bg)/40 focus-visible:ring-1 focus-visible:ring-(--link-text)/60 focus-visible:outline-none"
		>
			<div className="flex items-center justify-between gap-3">
				<span className="text-[10px] leading-none font-semibold tracking-[0.18em] text-(--text-tertiary) uppercase">
					On this page
				</span>
				<span className="flex items-center gap-1 text-[10px] leading-none font-medium tracking-[0.12em] text-(--text-tertiary) uppercase transition-colors group-hover:text-(--link-text)">
					<span>Top</span>
					<Icon name="arrow-up" className="h-3 w-3" />
				</span>
			</div>
			<div className="flex items-baseline gap-3">
				<span className="font-jetbrains text-[11px] leading-none tracking-tight text-(--text-tertiary) tabular-nums">
					{displayNumber}
					<span className="text-(--text-tertiary)/50">/{displayTotal}</span>
				</span>
				<span className="min-w-0 flex-1 truncate text-[15px] leading-6 font-bold text-(--text-primary)">
					{currentEntry?.text ?? '—'}
				</span>
			</div>
			<div className="relative h-px w-full bg-(--cards-border)">
				<span
					aria-hidden
					className="absolute inset-y-0 left-0 bg-(--link-text) transition-[width] duration-300 ease-out"
					style={{ width: `${pct}%` }}
				/>
			</div>
		</button>
	)
}

function ArticleToc({ toc, compactMode = false }: { toc: TocEntry[]; compactMode?: boolean }) {
	const [active, setActive] = useActiveHeading(toc)
	const groups = useMemo(() => groupToc(toc), [toc])
	const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(groups.map((g) => g.id)))
	const prevCompactRef = useRef(compactMode)

	useEffect(() => {
		if (prevCompactRef.current && !compactMode) {
			setCollapsed(new Set(groups.map((g) => g.id)))
		}
		prevCompactRef.current = compactMode
	}, [compactMode, groups])

	if (compactMode) {
		return <CompactTocBar toc={toc} groups={groups} active={active} />
	}

	const toggle = (id: string) => {
		setCollapsed((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	return (
		<nav aria-label="On this page" className="grid">
			<ol className="m-0 grid list-none gap-px p-0">
				{groups.map((group) => {
					const isCollapsed = collapsed.has(group.id)
					const hasChildren = group.children.length > 0
					const isParentActive = active === group.id
					return (
						<li key={group.id} className="relative">
							{hasChildren ? (
								<button
									type="button"
									onClick={() => toggle(group.id)}
									className="flex w-full items-center justify-between gap-2 px-5 py-1.5 text-left text-[15px] leading-6 font-bold text-(--text-primary) hover:text-(--link-text)"
								>
									<a
										href={`#${group.id}`}
										onClick={(event) => {
											event.stopPropagation()
											setActive(group.id)
										}}
										className={`min-w-0 flex-1 truncate ${isParentActive ? 'underline' : ''}`}
									>
										{group.text}
									</a>
									<Icon
										name={isCollapsed ? 'chevron-right' : 'chevron-down'}
										className="h-3 w-3 shrink-0 text-(--text-secondary)"
									/>
								</button>
							) : (
								<a
									href={`#${group.id}`}
									onClick={() => setActive(group.id)}
									className={`flex items-center px-5 py-1.5 text-[15px] leading-6 font-bold text-(--text-primary) hover:text-(--link-text) ${
										isParentActive ? 'underline' : ''
									}`}
								>
									<span className="truncate">{group.text}</span>
								</a>
							)}
							{isParentActive ? <ActivePill /> : null}
							{!isCollapsed && hasChildren ? (
								<ol className="m-0 grid list-none gap-px p-0">
									{group.children.map((child) => {
										const isActive = active === child.id
										return (
											<li key={child.id} className="relative">
												<a
													href={`#${child.id}`}
													onClick={() => setActive(child.id)}
													className={`block truncate py-1.5 pr-3 pl-10 text-[15px] leading-6 transition-colors ${
														isActive
															? 'font-semibold text-(--text-primary) underline'
															: 'text-(--text-secondary) hover:text-(--text-primary)'
													}`}
												>
													{child.text}
												</a>
												{isActive ? <ActivePill /> : null}
											</li>
										)
									})}
								</ol>
							) : null}
						</li>
					)
				})}
			</ol>
		</nav>
	)
}

function LinkedInIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
			<path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.21 0 22.23 0z" />
		</svg>
	)
}

function ShareIcons({ url, title, size = 'md' }: { url: string; title: string; size?: 'sm' | 'md' }) {
	const [copied, setCopied] = useState(false)
	const tweetUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
	const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
	const onCopy = async () => {
		if (typeof navigator === 'undefined' || !navigator.clipboard) return
		try {
			await navigator.clipboard.writeText(url)
			setCopied(true)
			setTimeout(() => setCopied(false), 1500)
		} catch {}
	}
	const dim = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11'
	const iconDim = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
	const buttonClass = `flex ${dim} items-center justify-center rounded-full border border-(--cards-border) bg-(--cards-bg) text-(--text-primary) transition-colors hover:border-(--link-text)/50 hover:text-(--link-text)`
	return (
		<div className="flex items-center gap-1.5">
			<a
				href={tweetUrl}
				target="_blank"
				rel="noreferrer noopener"
				aria-label="Share on Twitter"
				className={buttonClass}
			>
				<Icon name="twitter" className={iconDim} />
			</a>
			<a
				href={linkedInUrl}
				target="_blank"
				rel="noreferrer noopener"
				aria-label="Share on LinkedIn"
				className={buttonClass}
			>
				<LinkedInIcon className={iconDim} />
			</a>
			<button type="button" onClick={onCopy} aria-label="Copy link" className={buttonClass}>
				<Icon name={copied ? 'check-circle' : 'link'} className={iconDim} />
			</button>
		</div>
	)
}

function ShareBlock({ url, title }: { url: string; title: string }) {
	return (
		<div className="grid gap-8">
			<div role="separator" className="h-px bg-(--cards-border)" />
			<div className="flex flex-col items-center gap-5">
				<div className="flex items-center gap-1.5">
					<span className="text-[18px] leading-none font-semibold tracking-wide text-(--text-primary)">SHARE</span>
					<Icon name="share" className="h-4 w-4 text-(--text-primary)" />
				</div>
				<ShareIcons url={url} title={title} />
			</div>
			<div role="separator" className="h-px bg-(--cards-border)" />
		</div>
	)
}

export function ArticleRenderer({ article }: { article: LocalArticleDocument }) {
	const visibleDateIso =
		article.displayDate ??
		(article.status === 'published' ? (article.publishedAt ?? article.lastPublishedAt ?? null) : article.updatedAt)
	const publishedLabel = visibleDateIso
		? formatHeaderDate(visibleDateIso)
		: article.status === 'published'
			? null
			: 'Draft'
	const ctx: RenderContext = { figureCount: { value: 0 } }

	const toc: TocEntry[] = []
	collectToc(article.contentJson, toc)

	const sectionLabel = article.section ? ARTICLE_SECTION_LABELS[article.section] : null
	const brandByline = article.brandByline === true
	const tagChips = (article.tags ?? []).filter((tag) => typeof tag === 'string' && tag.trim().length > 0)

	const sectionPath = article.section ? `/research/${ARTICLE_SECTION_SLUGS[article.section]}/${article.slug}` : null
	const [shareUrl, setShareUrl] = useState<string>(sectionPath ?? `/research/${article.slug}`)
	useEffect(() => {
		if (typeof window !== 'undefined') {
			setShareUrl(window.location.href)
		}
	}, [article.slug, article.section])

	const sentinelRef = useRef<HTMLDivElement>(null)
	const [pastHeader, setPastHeader] = useState(false)
	useEffect(() => {
		const el = sentinelRef.current
		if (!el || typeof window === 'undefined') return
		let raf = 0
		const update = () => {
			const top = el.getBoundingClientRect().top
			setPastHeader(top < 24)
		}
		const onScroll = () => {
			cancelAnimationFrame(raf)
			raf = requestAnimationFrame(update)
		}
		update()
		window.addEventListener('scroll', onScroll, { passive: true })
		window.addEventListener('resize', onScroll)
		return () => {
			cancelAnimationFrame(raf)
			window.removeEventListener('scroll', onScroll)
			window.removeEventListener('resize', onScroll)
		}
	}, [])

	const cover = article.coverImage ?? null
	const coverHeadline = cover ? (cover.headline ?? '').trim() : ''
	const coverCaption = cover ? (cover.caption ?? '').trim() : ''
	const coverCredit = cover ? (cover.credit ?? '').trim() : ''
	const coverCopyright = cover ? (cover.copyright ?? '').trim() : ''
	const coverMetaParts = cover
		? [coverCredit ? `Credit: ${coverCredit}` : '', coverCopyright ? `© ${coverCopyright}` : ''].filter(Boolean)
		: []
	const hasCoverMeta = !!cover && (coverHeadline || coverCaption || coverMetaParts.length > 0)

	const isInterview = article.section === 'interview'
	const bylineLabel = isInterview ? 'Interviewer' : 'By'
	const bylineNode = brandByline ? (
		<span className="flex flex-wrap items-center gap-1 text-xs text-(--text-secondary)">
			<span className="font-normal">{bylineLabel}</span>
			<Link href="/research/authors" className="font-semibold text-(--text-primary) hover:text-(--link-text)">
				DefiLlama Research
			</Link>
		</span>
	) : article.author ? (
		(() => {
			const ownerLink = article.authorProfile ? (
				<Link
					key={article.authorProfile.id}
					href={`/research/authors/${article.authorProfile.slug}`}
					className="font-semibold text-(--text-primary) hover:text-(--link-text)"
				>
					{article.author}
				</Link>
			) : (
				<span key="owner" className="font-semibold text-(--text-primary)">
					{article.author}
				</span>
			)
			const coAuthorLinks = (article.coAuthors ?? []).map((profile) => (
				<Link
					key={profile.id}
					href={`/research/authors/${profile.slug}`}
					className="font-semibold text-(--text-primary) hover:text-(--link-text)"
				>
					{profile.displayName}
				</Link>
			))
			const links = [ownerLink, ...coAuthorLinks]
			return (
				<span className="flex flex-wrap items-center gap-1 text-xs text-(--text-secondary)">
					<span className="font-normal">{bylineLabel}</span>
					{links.map((node, index) => (
						<span key={index} className="flex items-center gap-1">
							{node}
							{index < links.length - 2 ? <span>,</span> : null}
							{index === links.length - 2 ? <span>and</span> : null}
						</span>
					))}
				</span>
			)
		})()
	) : null

	const intervieweesList = isInterview ? (article.interviewees ?? []).filter((p) => p?.name?.trim()) : []
	const intervieweeNode =
		intervieweesList.length > 0 ? (
			<span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--text-secondary)">
				<span className="font-normal">Interviewee{intervieweesList.length > 1 ? 's' : ''}</span>
				{intervieweesList.map((person, index) => {
					const labelNode = (
						<span className="inline-flex items-center gap-1.5">
							{person.avatarUrl ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={person.avatarUrl}
									alt=""
									className="h-5 w-5 shrink-0 rounded-full border border-(--cards-border) object-cover"
								/>
							) : null}
							<span className="font-semibold text-(--text-primary)">{person.name}</span>
							{person.role ? <span className="text-(--text-tertiary)">· {person.role}</span> : null}
						</span>
					)
					const href = person.authorSlug
						? `/research/authors/${person.authorSlug}`
						: person.externalUrl
							? person.externalUrl
							: null
					const linked = href ? (
						person.authorSlug ? (
							<Link href={href} className="hover:text-(--link-text)">
								{labelNode}
							</Link>
						) : (
							<a href={href} target="_blank" rel="noreferrer noopener" className="hover:text-(--link-text)">
								{labelNode}
							</a>
						)
					) : (
						labelNode
					)
					return (
						<span key={index} className="flex items-center gap-1">
							{linked}
							{index < intervieweesList.length - 2 ? <span>,</span> : null}
							{index === intervieweesList.length - 2 ? <span>and</span> : null}
						</span>
					)
				})}
			</span>
		) : null

	return (
		<div className="article-page mx-auto grid w-full max-w-[1300px] animate-fadein gap-10 px-4 pb-24 sm:px-6 lg:grid-cols-[minmax(0,700px)_401px] lg:gap-[125px]">
			<article className="article-published min-w-0">
				<header className="grid gap-4 pt-6 sm:pt-10 lg:gap-5">
					<h1 className="text-[26px] leading-[1.2] font-bold tracking-tight text-(--text-primary) sm:text-3xl sm:leading-[1.15] md:text-[36px] md:leading-[1.32]">
						{article.title}
					</h1>
					{article.subtitle ? (
						<p className="text-base leading-snug text-(--text-secondary) md:text-lg">{article.subtitle}</p>
					) : null}
					{article.section === 'report' && article.reportPdf ? (
						<div>
							<a
								href={article.reportPdf.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 rounded-md bg-(--link-text) px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
							>
								<svg
									viewBox="0 0 24 24"
									className="h-4 w-4"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden
								>
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
									<polyline points="7 10 12 15 17 10" />
									<line x1="12" y1="15" x2="12" y2="3" />
								</svg>
								Download PDF
							</a>
						</div>
					) : null}
				</header>

				{cover ? (
					<figure className="mt-5 grid gap-2">
						<div className="aspect-[700/400] w-full overflow-hidden">
							<img src={cover.url} alt={cover.alt || ''} className="block h-full w-full object-cover" />
						</div>
						{hasCoverMeta ? (
							<figcaption className="grid gap-1 text-xs text-(--text-tertiary)">
								{coverHeadline ? <span className="font-medium text-(--text-secondary)">{coverHeadline}</span> : null}
								{coverCaption ? <span>{coverCaption}</span> : null}
								{coverMetaParts.length > 0 ? (
									<span className="text-(--text-tertiary)/80">{coverMetaParts.join(' · ')}</span>
								) : null}
							</figcaption>
						) : null}
					</figure>
				) : null}

				<div className={`hidden flex-wrap items-center justify-between gap-3 lg:flex ${cover ? 'mt-5' : 'mt-6'} pb-8`}>
					<div className="flex flex-wrap items-center gap-x-5 gap-y-2">
						<div className="grid gap-1">
							{bylineNode}
							{intervieweeNode}
						</div>
						{(sectionLabel || tagChips.length > 0) && (
							<div className="flex flex-wrap items-center gap-1.5">
								{sectionLabel ? <MetaChip>{sectionLabel}</MetaChip> : null}
								{tagChips.map((tag) => (
									<MetaChip key={tag}>{tag}</MetaChip>
								))}
							</div>
						)}
					</div>
					{publishedLabel ? (
						<span className="text-xs whitespace-nowrap text-(--text-secondary)">{publishedLabel}</span>
					) : null}
				</div>

				<div className={`grid gap-3 lg:hidden ${cover ? 'mt-5' : 'mt-6'} pb-6`}>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="grid gap-1">
							{bylineNode}
							{intervieweeNode}
						</div>
						{publishedLabel ? (
							<span className="text-xs whitespace-nowrap text-(--text-secondary)">{publishedLabel}</span>
						) : null}
					</div>
					{(sectionLabel || tagChips.length > 0) && (
						<div className="flex flex-wrap items-center gap-1.5">
							{sectionLabel ? <MetaChip>{sectionLabel}</MetaChip> : null}
							{tagChips.map((tag) => (
								<MetaChip key={tag}>{tag}</MetaChip>
							))}
						</div>
					)}
					<div className="flex items-center gap-2">
						<span className="text-[13px] leading-none font-semibold tracking-wide text-(--text-primary)">SHARE</span>
						<Icon name="share" className="h-3.5 w-3.5 text-(--text-primary)" />
						<div className="ml-1">
							<ShareIcons url={shareUrl} title={article.title} size="sm" />
						</div>
					</div>
				</div>

				{toc.length > 1 ? (
					<div className="grid gap-6 pb-2 lg:hidden">
						<div role="separator" className="h-px bg-(--cards-border)" />
						<ArticleToc toc={toc} />
						<div role="separator" className="h-px bg-(--cards-border)" />
					</div>
				) : null}

				<div ref={sentinelRef} aria-hidden className="h-0 w-full" />

				<div className="article-prose [overflow-wrap:anywhere] break-words">
					<div className="prose max-w-none prose-neutral dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h1:mt-8 prose-h1:mb-3 prose-h2:mt-6 prose-h2:mb-2 prose-h2:text-2xl prose-h3:mt-5 prose-h3:mb-1.5 prose-h3:text-lg prose-h4:mt-4 prose-h4:mb-1.5 prose-h4:text-base prose-h5:mt-3 prose-h5:mb-1 prose-h5:text-sm prose-h6:mt-3 prose-h6:mb-1 prose-h6:text-sm prose-p:my-3 prose-p:leading-[1.65] prose-a:font-medium prose-a:text-(--link-text) prose-a:no-underline hover:prose-a:underline prose-blockquote:my-4 prose-blockquote:border-l-2 prose-blockquote:border-(--link-text) prose-blockquote:bg-transparent prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:text-(--text-secondary) prose-blockquote:not-italic prose-figure:my-4 prose-strong:text-(--text-primary) prose-code:rounded prose-code:bg-(--link-button) prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.92em] prose-code:text-(--link-text) prose-code:before:hidden prose-code:after:hidden prose-pre:my-4 prose-pre:border prose-pre:border-(--cards-border) prose-pre:bg-(--cards-bg) prose-pre:text-(--text-primary) prose-ol:my-3 prose-ul:my-3 prose-li:my-1 prose-img:my-4 prose-hr:my-6 prose-hr:border-(--cards-border) [&_.article-table_p]:my-0 [&_.article-table_td]:border [&_.article-table_td]:border-(--cards-border) [&_.article-table_td]:px-3 [&_.article-table_td]:py-2 [&_.article-table_td]:align-top [&_.article-table_td]:text-(--text-secondary) [&_.article-table_th]:border [&_.article-table_th]:border-(--cards-border) [&_.article-table_th]:bg-(--app-bg) [&_.article-table_th]:px-3 [&_.article-table_th]:py-2 [&_.article-table_th]:text-left [&_.article-table_th]:font-semibold [&_.article-table_th]:text-(--text-primary) [&_:where(h1,h2,h3,h4,h5,h6):first-child]:mt-0 [&_li>p]:my-0 [&_li>p]:leading-[1.55]">
						{(() => {
							const docContent = article.contentJson?.content ?? []
							const nodes = docContent.map((child, idx) => renderNode(child, `article-root-${idx}`, ctx))
							if (docContent.length === 0) return nodes
							const slot = horizontalBannerSlot(article.id ?? '', docContent.length)
							const banner = (
								<ArticleImageBannerHorizontal
									key="article-mobile-banner"
									articleId={article.id ?? ''}
									section={article.section ?? null}
								/>
							)
							return [...nodes.slice(0, slot), banner, ...nodes.slice(slot)]
						})()}
					</div>
				</div>
			</article>

			<aside className="hidden lg:sticky lg:top-6 lg:block lg:self-start">
				<div className="flex flex-col gap-8 border-l border-(--cards-border) pt-10 pr-1 pb-6 pl-5">
					{toc.length > 1 ? (
						<div className="pr-2">
							<ArticleToc toc={toc} compactMode={pastHeader} />
						</div>
					) : null}
					<div className="pr-2">
						<ShareBlock url={shareUrl} title={article.title} />
					</div>
					<div className="pr-2">
						<ArticleImageBanner articleId={article.id} section={article.section ?? null} />
					</div>
				</div>
			</aside>
		</div>
	)
}
