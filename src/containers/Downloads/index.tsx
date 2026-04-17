import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useCallback } from 'react'
import { LoadingSpinner } from '~/components/Loaders'
import { useAuthContext } from '~/containers/Subscription/auth'
import type { ChartOptionsMap } from './chart-datasets'
import { DownloadsCatalog as SimpleCatalog } from './DownloadsCatalog'
import { ModeToggle, type DownloadsMode } from './sql/ModeToggle'

// SQL workspace pulls in DuckDB-WASM + Monaco. Loading it dynamically keeps the simple-mode
// bundle unchanged for users who never open SQL.
const SqlWorkspace = dynamic(() => import('./sql/SqlWorkspace').then((m) => m.SqlWorkspace), {
	ssr: false,
	loading: () => (
		<div className="flex h-64 items-center justify-center">
			<LoadingSpinner size={20} />
		</div>
	)
})

interface DownloadsCatalogProps {
	chartOptionsMap: ChartOptionsMap
}

export function DownloadsCatalog({ chartOptionsMap }: DownloadsCatalogProps) {
	const router = useRouter()
	const { user, loaders } = useAuthContext()
	// SQL workspace is gated behind the internal `is_llama` flag.
	// While the user is loading we hide the toggle (and ignore ?mode=sql) so we don't flash UI
	// that the viewer can't access.
	const sqlEnabled = !loaders.userLoading && !!user?.flags?.is_llama

	const rawMode = router.query.mode
	const requestedMode: DownloadsMode = (Array.isArray(rawMode) ? rawMode[0] : rawMode) === 'sql' ? 'sql' : 'simple'
	const mode: DownloadsMode = sqlEnabled ? requestedMode : 'simple'

	const handleModeChange = useCallback(
		(next: DownloadsMode) => {
			const { mode: _discard, ...rest } = router.query
			const query = next === 'sql' ? { ...rest, mode: 'sql' } : rest
			router.replace({ pathname: router.pathname, query }, undefined, { shallow: true })
		},
		[router]
	)

	const toggle = sqlEnabled ? <ModeToggle mode={mode} onChange={handleModeChange} /> : null

	if (mode === 'sql') {
		return <SqlWorkspace chartOptionsMap={chartOptionsMap} topRight={toggle} />
	}
	return <SimpleCatalog chartOptionsMap={chartOptionsMap} headerTrailing={toggle} />
}
