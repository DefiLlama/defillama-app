import type * as echarts from 'echarts/core'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'

const DEFAULT_CLASSNAME =
	'flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:text-(--text-disabled)'

interface ChartRestoreButtonProps {
	chartInstance: () => echarts.ECharts | null
	className?: string
	smol?: boolean
}

export function ChartRestoreButton({
	chartInstance,
	className = DEFAULT_CLASSNAME,
	smol = true
}: ChartRestoreButtonProps) {
	const router = useRouter()

	const handleRestore = () => {
		const instance = chartInstance()
		if (!instance) return
		instance.dispatchAction({ type: 'restore' } as any)
	}

	return (
		<button
			data-umami-event="chart-restore"
			data-umami-event-page={router.pathname}
			className={className}
			onClick={handleRestore}
			title="Restore chart view"
		>
			<Icon name="repeat" height={12} width={12} />
			<span>{smol ? 'reset' : 'Restore'}</span>
		</button>
	)
}
