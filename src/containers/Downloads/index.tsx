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

	if (mode === 'sql') {
		return (
			<SqlWorkspace
				chartOptionsMap={chartOptionsMap}
				topRight={<ModeToggle mode={mode} onChange={handleModeChange} size="sm" />}
			/>
		)
	}
	return (
		<SimpleCatalog
			chartOptionsMap={chartOptionsMap}
			modeSwitcher={<ModeToggle mode={mode} onChange={handleModeChange} size="md" />}
		/>
	)
}
