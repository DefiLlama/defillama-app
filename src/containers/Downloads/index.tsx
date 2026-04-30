import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useCallback } from 'react'
import { LocalLoader } from '~/components/Loaders'
import type { ChartOptionsMap } from './chart-datasets'
import { DownloadsCatalog as SimpleCatalog } from './DownloadsCatalog'
import { ModeToggle, type DownloadsMode } from './sql/ModeToggle'

const SqlWorkspace = dynamic(() => import('./sql/SqlWorkspace').then((m) => m.SqlWorkspace), {
	ssr: false,
	loading: () => (
		<div className="flex min-h-[60vh] items-center justify-center">
			<LocalLoader />
		</div>
	)
})

interface DownloadsCatalogProps {
	chartOptionsMap: ChartOptionsMap
}

export function DownloadsCatalog({ chartOptionsMap }: DownloadsCatalogProps) {
	const router = useRouter()

	const rawMode = router.query.mode
	const mode: DownloadsMode = (Array.isArray(rawMode) ? rawMode[0] : rawMode) === 'sql' ? 'sql' : 'simple'

	const handleModeChange = useCallback(
		(next: DownloadsMode) => {
			const { mode: _discard, ...rest } = router.query
			const query = next === 'sql' ? { ...rest, mode: 'sql' } : rest
			router.replace({ pathname: router.pathname, query }, undefined, { shallow: true })
		},
		[router]
	)

	return (
		<div className="flex flex-col gap-6">
			<ModeBand mode={mode} onChange={handleModeChange} />
			{mode === 'sql' ? (
				<SqlWorkspace chartOptionsMap={chartOptionsMap} />
			) : (
				<SimpleCatalog chartOptionsMap={chartOptionsMap} />
			)}
		</div>
	)
}

function ModeBand({ mode, onChange }: { mode: DownloadsMode; onChange: (next: DownloadsMode) => void }) {
	const isSql = mode === 'sql'
	const title = isSql ? 'SQL Studio' : 'Power user? Try SQL Studio'
	const subtitle = isSql
		? "You're in SQL Studio — switch back to the simple catalog anytime."
		: 'Run live SQL across every DefiLlama dataset — joins, rolling windows, and instant CSV exports.'

	return (
		<div className="flex flex-col gap-3 rounded-xl border border-(--sub-brand-primary)/25 bg-linear-to-br from-(--sub-brand-primary)/8 to-(--cards-bg) p-3 sm:flex-row sm:items-center sm:gap-5 sm:p-4">
			<div className="flex flex-col gap-0.5">
				<span className="text-sm font-semibold tracking-tight text-(--text-primary)">{title}</span>
				<span className="text-xs leading-relaxed text-(--text-secondary)">{subtitle}</span>
			</div>
			{isSql ? null : (
				<div aria-hidden className="hidden shrink-0 items-center sm:ml-auto sm:flex">
					<span className="rounded-md border border-(--divider) bg-(--cards-bg) px-2.5 py-1 font-mono text-[10.5px] tracking-tight">
						<span className="font-semibold text-(--sub-brand-primary)">SELECT</span>
						<span className="text-(--text-tertiary)"> * </span>
						<span className="font-semibold text-(--sub-brand-primary)">FROM</span>
						<span className="text-(--text-secondary)"> chains</span>
					</span>
				</div>
			)}
			<div className={`shrink-0 ${isSql ? 'sm:ml-auto' : ''}`}>
				<ModeToggle mode={mode} onChange={onChange} size="md" />
			</div>
		</div>
	)
}
