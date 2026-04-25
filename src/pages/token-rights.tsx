import Link from 'next/link'
import { TokenLogo } from '~/components/TokenLogo'
import type { IRawTokenRightsEntry } from '~/containers/TokenRights/api.types'
import Layout from '~/layout'
import { isDatasetCacheEnabled } from '~/server/datasetCache/config'
import { formatRuntimeLog, postRuntimeLogs } from '~/utils/async'
import { tokenIconUrl } from '~/utils/icons'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import type { IChainMetadata, IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'
import { findTokenDirectoryRecordByGeckoId, type TokenDirectory } from '~/utils/tokenDirectory'

interface TokenRightsListItem {
	name: string
	logo: string
	href: string
}

type TokenRightsMetadataMatch =
	| { source: 'chain'; metadata: IChainMetadata }
	| { source: 'protocol'; metadata: IProtocolMetadata }

type SkippedTokenRightsEntry = {
	defillamaId: string | null
	reason:
		| 'missing_defillama_id'
		| 'missing_metadata'
		| 'missing_display_name'
		| 'missing_gecko_id'
		| 'missing_token'
		| 'missing_token_route'
	metadataSource?: TokenRightsMetadataMatch['source']
	geckoId?: string
}

type TokenRightsLinkResolution =
	| { type: 'linked'; item: TokenRightsListItem }
	| { type: 'skipped'; entry: SkippedTokenRightsEntry }

const TOKEN_RIGHTS_ALERT_TIMEOUT_MS = 5_000

export const getStaticProps = withPerformanceLogging('token-rights', async () => {
	const metadataModule = await import('~/utils/metadata')
	await metadataModule.refreshMetadataIfStale()
	const shouldUseDatasetCache = isDatasetCacheEnabled()
	const entries = shouldUseDatasetCache
		? await (async () => {
				const { fetchTokenRightsEntriesFromCache } = await import('~/server/datasetCache/tokenRights')
				return fetchTokenRightsEntriesFromCache()
			})()
		: await import('~/containers/TokenRights/api').then((m) => m.fetchTokenRightsData())

	const { chainMetadata, protocolMetadata, tokenDirectory } = metadataModule.default as {
		chainMetadata: Record<string, IChainMetadata>
		protocolMetadata: Record<string, IProtocolMetadata>
		tokenDirectory: TokenDirectory
	}

	const protocols: TokenRightsListItem[] = []
	const skippedEntries: SkippedTokenRightsEntry[] = []

	for (const entry of entries) {
		const resolved = resolveTokenRightsListItem(entry, { chainMetadata, protocolMetadata, tokenDirectory })

		if (resolved.type === 'linked') {
			protocols.push(resolved.item)
		} else {
			skippedEntries.push(resolved.entry)
		}
	}

	protocols.sort((a, b) => a.name.localeCompare(b.name))
	await reportSkippedTokenRightsEntries(skippedEntries)

	return {
		props: { protocols },
		revalidate: maxAgeForNext([22])
	}
})

function resolveTokenRightsListItem(
	entry: IRawTokenRightsEntry,
	{
		chainMetadata,
		protocolMetadata,
		tokenDirectory
	}: {
		chainMetadata: Record<string, IChainMetadata>
		protocolMetadata: Record<string, IProtocolMetadata>
		tokenDirectory: TokenDirectory
	}
): TokenRightsLinkResolution {
	const defillamaId = entry['DefiLlama ID']?.trim() || null
	const baseSkippedEntry = { defillamaId }

	if (!defillamaId) {
		return { type: 'skipped', entry: { ...baseSkippedEntry, reason: 'missing_defillama_id' } }
	}

	const metadataMatch = findTokenRightsMetadataByDefillamaId(defillamaId, chainMetadata, protocolMetadata)
	if (!metadataMatch) {
		return { type: 'skipped', entry: { ...baseSkippedEntry, reason: 'missing_metadata' } }
	}

	const name = getMetadataDisplayName(metadataMatch)
	if (!name) {
		return {
			type: 'skipped',
			entry: {
				...baseSkippedEntry,
				reason: 'missing_display_name',
				metadataSource: metadataMatch.source
			}
		}
	}

	const geckoId = metadataMatch.metadata.gecko_id
	if (!geckoId) {
		return {
			type: 'skipped',
			entry: {
				...baseSkippedEntry,
				reason: 'missing_gecko_id',
				metadataSource: metadataMatch.source
			}
		}
	}

	const tokenRecord = findTokenDirectoryRecordByGeckoId(tokenDirectory, geckoId)
	if (!tokenRecord) {
		return {
			type: 'skipped',
			entry: {
				...baseSkippedEntry,
				reason: 'missing_token',
				metadataSource: metadataMatch.source,
				geckoId
			}
		}
	}

	if (!tokenRecord.route) {
		return {
			type: 'skipped',
			entry: {
				...baseSkippedEntry,
				reason: 'missing_token_route',
				metadataSource: metadataMatch.source,
				geckoId
			}
		}
	}

	return {
		type: 'linked',
		item: {
			name,
			logo: tokenRecord.logo ?? tokenIconUrl(name),
			href: tokenRecord.route
		}
	}
}

function findTokenRightsMetadataByDefillamaId(
	defillamaId: string,
	chainMetadata: Record<string, IChainMetadata>,
	protocolMetadata: Record<string, IProtocolMetadata>
): TokenRightsMetadataMatch | null {
	const chain = chainMetadata[defillamaId]
	if (chain) return { source: 'chain', metadata: chain }

	const protocol = protocolMetadata[defillamaId]
	if (protocol) return { source: 'protocol', metadata: protocol }

	return null
}

function getMetadataDisplayName(metadataMatch: TokenRightsMetadataMatch): string | null {
	if (metadataMatch.source === 'chain') {
		const chain = metadataMatch.metadata as IChainMetadata & { displayName?: string }
		return chain.displayName ?? chain.name ?? null
	}

	return metadataMatch.metadata.displayName ?? metadataMatch.metadata.name ?? null
}

async function reportSkippedTokenRightsEntries(skippedEntries: SkippedTokenRightsEntry[]): Promise<void> {
	if (skippedEntries.length === 0) return

	const log = formatRuntimeLog({
		event: 'TOKEN_RIGHTS_LINKS',
		level: 'warn',
		status: 'skipped',
		context: {
			count: skippedEntries.length,
			entries: skippedEntries.slice(0, 25),
			truncated: Math.max(0, skippedEntries.length - 25)
		},
		message: 'Skipped token rights entries without token page routes'
	})

	const webhookUrl = process.env.TOKEN_RIGHTS_ALERT_WEBHOOK
	if (!webhookUrl) {
		postRuntimeLogs(log, { level: 'warn' })
		return
	}

	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), TOKEN_RIGHTS_ALERT_TIMEOUT_MS)

	try {
		const response = await fetch(webhookUrl, {
			method: 'POST',
			body: JSON.stringify({ content: formatTokenRightsDiscordAlert(skippedEntries) }),
			headers: { 'Content-Type': 'application/json' },
			signal: controller.signal
		})

		if (!response.ok) {
			throw new Error(`Discord webhook returned ${response.status}`)
		}
	} catch (error) {
		postRuntimeLogs(log, { level: 'warn' })
		postRuntimeLogs(
			formatRuntimeLog({
				event: 'TOKEN_RIGHTS_LINKS',
				level: 'error',
				status: 'alert_failed',
				message: error instanceof Error ? error.message : String(error)
			}),
			{ level: 'error', forceConsole: true }
		)
	} finally {
		clearTimeout(timeout)
	}
}

function formatTokenRightsDiscordAlert(skippedEntries: SkippedTokenRightsEntry[]): string {
	const lines = skippedEntries.slice(0, 20).map((entry) => {
		const details = [
			`id=${entry.defillamaId ?? '(missing)'}`,
			`reason=${entry.reason}`,
			entry.metadataSource ? `source=${entry.metadataSource}` : null,
			entry.geckoId ? `gecko=${entry.geckoId}` : null
		].filter(Boolean)

		return `- ${details.join(', ')}`
	})
	const truncated = skippedEntries.length - lines.length
	if (truncated > 0) lines.push(`- ...and ${truncated} more`)

	return [`Token rights links skipped: ${skippedEntries.length}`, ...lines].join('\n').slice(0, 1900)
}

function TokenRightsPage({ protocols }: { protocols: TokenRightsListItem[] }) {
	return (
		<Layout
			title="DeFi Token Rights by Project - DefiLlama"
			description="Explore token holder rights across DeFi protocols — governance, economic rights, value accrual, and alignment."
			canonicalUrl="/token-rights"
		>
			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h1 className="text-lg font-semibold">Token Rights</h1>
				<hr className="border-black/20 dark:border-white/20" />
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
					{protocols.map((p) => (
						<Link
							key={p.name}
							href={p.href}
							className="flex items-center gap-2 rounded-lg bg-black/5 p-2 transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
						>
							<TokenLogo src={p.logo} alt={`Logo of ${p.name}`} size={24} />
							<span className="truncate text-sm">{p.name}</span>
						</Link>
					))}
				</div>
			</div>
		</Layout>
	)
}

export default TokenRightsPage
