import type { PublicDashboardAuthor } from '~/containers/Authors/types'
import { slug } from '~/utils'
import { sluggifyProtocol } from '~/utils/cache-client'
import type { Dashboard } from '../services/DashboardAPI'
import type { DashboardItemConfig } from '../types'

const SITE_URL = 'https://defillama.com'
const DEFAULT_DASHBOARD_NAME = 'Untitled Dashboard'
const DEFAULT_DESCRIPTION = 'Community-built DefiLlama Pro dashboard.'
const MAX_DESCRIPTION_LENGTH = 155
const MAX_SUMMARY_ITEMS = 24

export interface DashboardItemSummary {
	id: string
	label: string
	href?: string
}

export interface DashboardSeo {
	title: string
	description: string
	canonicalPath: string
	updated: string | null
	tags: string[]
	itemCount: number
	itemSummaries: DashboardItemSummary[]
	jsonLd: Record<string, unknown>
}

export interface DashboardSeoPublicDashboard {
	id: string
	data: {
		dashboardName: string
	}
	visibility: 'public'
	tags: string[]
	description: string
	viewCount?: number
	likeCount?: number
	author?: PublicDashboardAuthor
	created: string
	updated: string
	editedAt?: string
}

export function toDashboardSeoPublicDashboard(dashboard: Dashboard): DashboardSeoPublicDashboard {
	return {
		id: dashboard.id,
		data: {
			dashboardName: dashboard.data?.dashboardName || DEFAULT_DASHBOARD_NAME
		},
		visibility: 'public',
		tags: Array.isArray(dashboard.tags) ? dashboard.tags.filter((tag) => typeof tag === 'string' && tag.trim()) : [],
		description: typeof dashboard.description === 'string' ? dashboard.description : '',
		viewCount: dashboard.viewCount,
		likeCount: dashboard.likeCount,
		author: dashboard.author,
		created: dashboard.created,
		updated: dashboard.updated,
		editedAt: dashboard.editedAt
	}
}

function safeSameAs(author: PublicDashboardAuthor | undefined): string[] {
	if (!author?.socials) return []
	return Object.values(author.socials).filter((value): value is string => {
		if (typeof value !== 'string') return false
		try {
			const url = new URL(value)
			return url.protocol === 'https:' && !url.username && !url.password
		} catch {
			return false
		}
	})
}

function compactWhitespace(value: string): string {
	return value.replace(/\s+/g, ' ').trim()
}

export function markdownToPlainText(value: unknown): string {
	if (typeof value !== 'string') return ''

	return compactWhitespace(
		value
			.replace(/<[^>]*>/g, ' ')
			.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
			.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
			.replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
			.replace(/(^|\s)#{1,6}\s+/g, ' ')
			.replace(/[*_~>#-]+/g, ' ')
	)
}

function truncateText(value: string, maxLength: number): string {
	const text = compactWhitespace(value)
	if (text.length <= maxLength) return text
	const sliced = text.slice(0, maxLength - 1)
	const lastSpace = sliced.lastIndexOf(' ')
	return `${sliced.slice(0, lastSpace > 80 ? lastSpace : sliced.length).trim()}...`
}

function titleCaseToken(value: unknown): string {
	if (typeof value !== 'string' || !value.trim()) return ''
	return value
		.replace(/[-_]/g, ' ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.split(' ')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ')
}

function getDashboardName(dashboard: Dashboard): string {
	return compactWhitespace(dashboard.data?.dashboardName || DEFAULT_DASHBOARD_NAME)
}

function getDashboardUpdated(dashboard: Dashboard): string | null {
	return dashboard.editedAt || dashboard.updated || dashboard.created || null
}

function protocolHref(protocol: unknown): string | undefined {
	if (typeof protocol !== 'string' || !protocol.trim()) return undefined
	return `/protocol/${sluggifyProtocol(protocol)}`
}

function chainHref(chain: unknown): string | undefined {
	if (typeof chain !== 'string' || !chain.trim() || chain === 'All') return undefined
	return `/chain/${slug(chain)}`
}

function subjectLabel(item: DashboardItemConfig): { label: string; href?: string } {
	if ('subject' in item && item.subject) {
		if (item.subject.itemType === 'protocol' && item.subject.protocol) {
			return { label: titleCaseToken(item.subject.protocol), href: protocolHref(item.subject.protocol) }
		}
		if (item.subject.itemType === 'chain' && item.subject.chain) {
			return { label: item.subject.chain, href: chainHref(item.subject.chain) }
		}
	}
	if ('protocolName' in item && item.protocolName) {
		return { label: item.protocolName, href: protocolHref(item.protocol) }
	}
	if ('protocol' in item && item.protocol) {
		return { label: titleCaseToken(item.protocol), href: protocolHref(item.protocol) }
	}
	if ('chain' in item && item.chain) {
		return { label: item.chain, href: chainHref(item.chain) }
	}
	return { label: 'DefiLlama' }
}

function summarizeSingleItem(item: DashboardItemConfig, index: number): DashboardItemSummary {
	const subject = subjectLabel(item)
	const fallbackId = `${item.kind}-${index}`
	const id = 'id' in item && typeof item.id === 'string' ? item.id : fallbackId

	switch (item.kind) {
		case 'chart':
			return {
				id,
				label: `${subject.label} ${titleCaseToken(item.type)} chart`,
				href: subject.href
			}
		case 'multi':
			return {
				id,
				label: item.name || `${item.items.length} chart comparison`
			}
		case 'table': {
			const dataset = titleCaseToken(item.datasetType || item.tableType || 'protocols')
			const chains = item.chains?.length ? ` for ${item.chains.slice(0, 3).join(', ')}` : ''
			return { id, label: `${dataset} table${chains}` }
		}
		case 'unified-table':
			return { id, label: `${item.rowHeaders.map(titleCaseToken).join(', ') || 'Protocol'} table` }
		case 'text': {
			const text = markdownToPlainText(item.title || item.content)
			return { id, label: text ? `Text note: ${truncateText(text, 90)}` : 'Text note' }
		}
		case 'metric': {
			const label = item.label || `${subject.label} ${titleCaseToken(item.type)} metric`
			return { id, label, href: subject.href }
		}
		case 'builder':
			return { id, label: item.name || `${titleCaseToken(item.config.metric)} ${item.config.mode} chart builder` }
		case 'yields':
			return { id, label: `${item.project} ${item.poolName} ${titleCaseToken(item.chartType || 'yield')} chart` }
		case 'stablecoins':
			return {
				id,
				label: `${item.chain} ${titleCaseToken(item.chartType)} stablecoins chart`,
				href: chainHref(item.chain)
			}
		case 'stablecoin-asset':
			return { id, label: `${item.stablecoin} ${titleCaseToken(item.chartType)} chart` }
		case 'advanced-tvl':
			return {
				id,
				label: `${item.protocolName} ${titleCaseToken(item.chartType)} chart`,
				href: protocolHref(item.protocol)
			}
		case 'advanced-borrowed':
			return {
				id,
				label: `${item.protocolName} ${titleCaseToken(item.chartType)} borrowed chart`,
				href: protocolHref(item.protocol)
			}
		case 'income-statement':
			return { id, label: `${item.protocolName} income statement`, href: protocolHref(item.protocol) }
		case 'unlocks-schedule':
			return { id, label: `${item.protocolName} unlocks schedule`, href: protocolHref(item.protocol) }
		case 'unlocks-pie':
			return {
				id,
				label: `${item.protocolName} ${titleCaseToken(item.chartType)} unlocks chart`,
				href: protocolHref(item.protocol)
			}
		case 'llamaai-chart':
			return { id, label: item.title || 'LlamaAI chart' }
		case 'rwa-overview':
			return { id, label: `${titleCaseToken(item.metric)} by ${titleCaseToken(item.breakdown)} RWA ${item.chartView}` }
		case 'rwa-asset':
			return { id, label: `${item.assetName} RWA asset chart` }
		default:
			return { id, label: `${titleCaseToken((item as DashboardItemConfig).kind)} item` }
	}
}

export function summarizeDashboardItems(items: DashboardItemConfig[] | undefined): DashboardItemSummary[] {
	if (!Array.isArray(items)) return []
	return items.slice(0, MAX_SUMMARY_ITEMS).map(summarizeSingleItem)
}

function buildFallbackDescription(
	dashboardName: string,
	itemSummaries: DashboardItemSummary[],
	itemCount: number
): string {
	if (itemCount === 0) return DEFAULT_DESCRIPTION

	const subjects = itemSummaries
		.map((item) => item.label)
		.filter(Boolean)
		.slice(0, 3)
		.join(', ')

	return truncateText(
		`${dashboardName} is a community-built DefiLlama Pro dashboard with ${itemCount} items${subjects ? ` covering ${subjects}` : ''}.`,
		MAX_DESCRIPTION_LENGTH
	)
}

export function buildDashboardSeo(dashboard: Dashboard): DashboardSeo {
	const name = getDashboardName(dashboard)
	const itemCount = Array.isArray(dashboard.data?.items) ? dashboard.data.items.length : 0
	const itemSummaries = summarizeDashboardItems(dashboard.data?.items)
	const explicitDescription = truncateText(markdownToPlainText(dashboard.description), MAX_DESCRIPTION_LENGTH)
	const description = explicitDescription || buildFallbackDescription(name, itemSummaries, itemCount)
	const canonicalPath = `/pro/${dashboard.id}`
	const updated = getDashboardUpdated(dashboard)
	const tags = Array.isArray(dashboard.tags)
		? dashboard.tags.filter((tag) => typeof tag === 'string' && tag.trim())
		: []
	const url = `${SITE_URL}${canonicalPath}`
	const author = dashboard.author
	const authorUrl = author ? `${SITE_URL}/authors/${author.slug}` : null
	const authorSameAs = safeSameAs(author)
	const authorNode =
		author && authorUrl
			? {
					'@type': 'Person',
					'@id': `${authorUrl}#person`,
					name: author.displayName,
					url: authorUrl,
					...(author.bio ? { description: author.bio } : {}),
					...(author.avatarUrl ? { image: author.avatarUrl } : {}),
					...(authorSameAs.length ? { sameAs: authorSameAs } : {})
				}
			: null
	const webPage = {
		'@type': 'WebPage',
		'@id': `${url}#webpage`,
		url,
		name,
		description,
		...(dashboard.created ? { datePublished: dashboard.created } : {}),
		...(updated ? { dateModified: updated } : {}),
		...(tags.length ? { keywords: tags.join(', ') } : {}),
		...(authorNode ? { author: { '@id': authorNode['@id'] } } : {}),
		isPartOf: {
			'@type': 'WebSite',
			name: 'DefiLlama',
			url: SITE_URL
		}
	}

	const graph: Record<string, unknown>[] = [
		webPage,
		{
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'DefiLlama', item: SITE_URL },
				{ '@type': 'ListItem', position: 2, name: 'Pro Dashboards', item: `${SITE_URL}/pro` },
				{ '@type': 'ListItem', position: 3, name, item: url }
			]
		}
	]
	if (authorNode) graph.push(authorNode)

	return {
		title: `${name} - DefiLlama Pro Dashboard`,
		description,
		canonicalPath,
		updated,
		tags,
		itemCount,
		itemSummaries,
		jsonLd: {
			'@context': 'https://schema.org',
			'@graph': graph
		}
	}
}
