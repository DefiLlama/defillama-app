import * as Ariakit from '@ariakit/react'
import { useState } from 'react'
import { Icon } from '~/components/Icon'
import type { DownloadFormat } from '~/utils/download'

interface FormatSplitButtonProps {
	onDownload: (format: DownloadFormat) => void
	disabled?: boolean
	label?: string
}

const FORMAT_LABELS: Record<DownloadFormat, string> = {
	csv: 'CSV',
	json: 'JSON'
}

export function FormatSplitButton({ onDownload, disabled, label = 'Download' }: FormatSplitButtonProps) {
	const [format, setFormat] = useState<DownloadFormat>('csv')

	return (
		<div className="inline-flex overflow-hidden rounded-md bg-(--primary) shadow-sm">
			<button
				type="button"
				onClick={() => onDownload(format)}
				disabled={disabled}
				className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black/10 disabled:opacity-40"
			>
				<Icon name="download-cloud" className="h-3.5 w-3.5" />
				<span className="hidden sm:inline">
					{label} {FORMAT_LABELS[format]}
				</span>
			</button>
			<Ariakit.MenuProvider>
				<Ariakit.MenuButton
					disabled={disabled}
					aria-label="Choose download format"
					className="flex items-center border-l border-white/20 px-1.5 text-white transition-colors hover:bg-black/10 disabled:opacity-40"
				>
					<Icon name="chevron-down" className="h-3.5 w-3.5" />
				</Ariakit.MenuButton>
				<Ariakit.Menu
					gutter={4}
					unmountOnHide
					hideOnInteractOutside
					className="z-50 min-w-32 overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) shadow-lg"
				>
					{(['csv', 'json'] as const).map((fmt) => (
						<Ariakit.MenuItem
							key={fmt}
							role="menuitemradio"
							aria-checked={format === fmt}
							onClick={() => {
								setFormat(fmt)
								onDownload(fmt)
							}}
							className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-xs font-medium text-(--text-primary) hover:bg-(--link-hover-bg) data-active-item:bg-(--link-hover-bg)"
						>
							<span>{FORMAT_LABELS[fmt]}</span>
							{format === fmt ? (
								<Icon name="check" className="h-3.5 w-3.5 text-(--primary)" />
							) : (
								<span className="h-3.5 w-3.5" aria-hidden="true" />
							)}
						</Ariakit.MenuItem>
					))}
				</Ariakit.Menu>
			</Ariakit.MenuProvider>
		</div>
	)
}
