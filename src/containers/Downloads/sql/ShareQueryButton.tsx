import { useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import type { QueryTableRef } from '../savedDownloads'
import { extractQueryConfig } from '../savedDownloads'
import { buildShareUrl } from '../urlState'
import type { ChartConfig } from './chartConfig'

interface ShareQueryButtonProps {
	sql: string
	tables: QueryTableRef[]
	chartConfig?: ChartConfig
	disabled?: boolean
}

export function ShareQueryButton({ sql, tables, chartConfig, disabled }: ShareQueryButtonProps) {
	const [copied, setCopied] = useState(false)

	const onClick = async () => {
		try {
			const url = buildShareUrl(window.location.origin, '/downloads', extractQueryConfig({ sql, tables, chartConfig }))
			const withMode = url.includes('mode=sql') ? url : `${url}${url.includes('?') ? '&' : '?'}mode=sql`
			await navigator.clipboard.writeText(withMode)
			setCopied(true)
			toast.success('Share link copied')
			setTimeout(() => setCopied(false), 1500)
		} catch {
			toast.error('Could not copy link')
		}
	}

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled || !sql.trim()}
			className="inline-flex items-center gap-1.5 rounded-md border border-(--divider) bg-(--cards-bg) px-3 py-1.5 text-xs font-medium text-(--text-primary) transition-colors hover:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40"
		>
			<Icon name={copied ? 'check' : 'share'} className="h-3.5 w-3.5" />
			{copied ? 'Copied' : 'Share'}
		</button>
	)
}
