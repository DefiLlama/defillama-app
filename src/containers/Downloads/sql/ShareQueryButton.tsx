import { useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import type { QueryTableRef } from '../savedDownloads'
import { extractQueryConfig } from '../savedDownloads'
import { buildNotebookShareUrl, buildShareUrl, type NotebookShareCell } from '../urlState'
import type { ChartConfig } from './chartConfig'

interface ShareQueryButtonProps {
	sql: string
	tables: QueryTableRef[]
	chartConfig?: ChartConfig
	disabled?: boolean
	mode?: 'query' | 'notebook'
	notebookCells?: NotebookShareCell[]
	notebookTitle?: string
}

const MAX_SAFE_URL_LENGTH = 7500

export function ShareQueryButton({
	sql,
	tables,
	chartConfig,
	disabled,
	mode = 'query',
	notebookCells = [],
	notebookTitle
}: ShareQueryButtonProps) {
	const [copied, setCopied] = useState(false)

	const isNotebook = mode === 'notebook'
	const hasContent = isNotebook ? notebookCells.some((c) => c.source.trim()) : !!sql.trim()

	const onClick = async () => {
		try {
			let url: string
			if (isNotebook) {
				url = buildNotebookShareUrl(window.location.origin, '/downloads', {
					title: notebookTitle,
					cells: notebookCells
				})
			} else {
				url = buildShareUrl(window.location.origin, '/downloads', extractQueryConfig({ sql, tables, chartConfig }))
			}
			const withMode = url.includes('mode=sql') ? url : `${url}${url.includes('?') ? '&' : '?'}mode=sql`
			if (withMode.length > MAX_SAFE_URL_LENGTH) {
				toast(
					(t) => (
						<span>
							Link is long ({withMode.length.toLocaleString()} chars) — some apps may truncate it.
							<button type="button" onClick={() => toast.dismiss(t.id)} style={{ marginLeft: 8 }}>
								OK
							</button>
						</span>
					),
					{ duration: 4000 }
				)
			}
			await navigator.clipboard.writeText(withMode)
			setCopied(true)
			toast.success(isNotebook ? 'Notebook link copied' : 'Share link copied')
			setTimeout(() => setCopied(false), 1500)
		} catch {
			toast.error('Could not copy link')
		}
	}

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled || !hasContent}
			className="inline-flex items-center gap-1.5 rounded-md border border-(--divider) bg-(--cards-bg) px-3 py-1.5 text-xs font-medium text-(--text-primary) transition-colors hover:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40"
		>
			<Icon name={copied ? 'check' : 'share'} className="h-3.5 w-3.5" />
			{copied ? 'Copied' : 'Share'}
		</button>
	)
}
