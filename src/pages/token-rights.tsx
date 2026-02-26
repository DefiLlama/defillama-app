import Link from 'next/link'
import { fetchTokenRightsData } from '~/containers/TokenRights/api'
import type { IRawTokenRightsEntry } from '~/containers/TokenRights/api.types'
import Layout from '~/layout'
import { slug, tokenIconUrl } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

interface TokenRightsListItem {
	name: string
	logo: string
	href: string
}

export const getStaticProps = withPerformanceLogging('token-rights', async () => {
	const [entries, metadataCache] = await Promise.all([
		fetchTokenRightsData(),
		import('~/utils/metadata').then((m) => m.default)
	])

	const { protocolMetadata } = metadataCache as { protocolMetadata: Record<string, IProtocolMetadata> }

	const protocols: TokenRightsListItem[] = []

	for (const entry of entries) {
		const name = resolveDisplayName(entry, protocolMetadata)
		if (!name) continue

		protocols.push({
			name,
			logo: tokenIconUrl(name),
			href: `/protocol/token-rights/${slug(name)}`
		})
	}

	protocols.sort((a, b) => a.name.localeCompare(b.name))

	return {
		props: { protocols },
		revalidate: maxAgeForNext([22])
	}
})

function resolveDisplayName(
	entry: IRawTokenRightsEntry,
	metadata: Record<string, IProtocolMetadata>
): string | null {
	const id = entry['DefiLlama ID']
	if (!id) return null

	const meta = metadata[id]
	if (meta?.displayName) return meta.displayName

	return entry['Protocol Name'] || null
}

function TokenRightsPage({ protocols }: { protocols: TokenRightsListItem[] }) {
	return (
		<Layout
			title="Token Rights - DefiLlama"
			description="Explore token holder rights across DeFi protocols — governance, economic rights, value accrual, and alignment."
			keywords="token rights, governance, economic rights, value accrual, defi"
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
							<img src={p.logo} alt={`${p.name} logo`} className="h-6 w-6 shrink-0 rounded-full" loading="lazy" />
							<span className="truncate text-sm">{p.name}</span>
						</Link>
					))}
				</div>
			</div>
		</Layout>
	)
}

export default TokenRightsPage
