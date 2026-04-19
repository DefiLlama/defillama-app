import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { SchemaBrowser, type SchemaBrowserProps } from './SchemaBrowser'

interface SchemaDrawerProps extends SchemaBrowserProps {
	open: boolean
	onClose: () => void
	totalDatasetCount: number
}

export function SchemaDrawer({ open, onClose, totalDatasetCount, onReplaceSql, ...browserProps }: SchemaDrawerProps) {
	const wrappedReplace = (snippet: string) => {
		onReplaceSql(snippet)
		onClose()
	}
	return (
		<Ariakit.DialogProvider
			open={open}
			setOpen={(next) => {
				if (!next) onClose()
			}}
		>
			<Ariakit.Dialog
				unmountOnHide
				backdrop={
					<div className="fixed inset-0 z-40 bg-black/20 opacity-0 transition-opacity duration-150 data-enter:opacity-100 dark:bg-black/40" />
				}
				className="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[640px] drawer-to-left flex-col overflow-hidden border-l border-(--divider) bg-(--cards-bg) shadow-2xl sm:max-w-[560px] lg:max-w-[640px]"
			>
				<header className="flex items-start justify-between gap-3 border-b border-(--divider) bg-(--app-bg)/40 px-5 py-3.5">
					<div className="flex min-w-0 flex-col gap-0.5">
						<h2 className="text-sm font-semibold tracking-tight text-(--text-primary)">Schema reference</h2>
						<p className="text-[11.5px] leading-snug text-(--text-tertiary)">
							{totalDatasetCount} tables ·{' '}
							<span className="text-(--text-secondary)">
								<span className="font-semibold text-(--text-primary)">Insert</span> writes a snippet at cursor.{' '}
								<span className="font-semibold text-(--text-primary)">Load</span> pulls the CSV into session. Column
								chips insert names.
							</span>
						</p>
					</div>
					<Ariakit.DialogDismiss
						onClick={onClose}
						aria-label="Close schema reference"
						className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-(--text-tertiary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
					>
						<Icon name="x" className="h-4 w-4" />
					</Ariakit.DialogDismiss>
				</header>

				<div className="thin-scrollbar flex-1 overflow-y-auto px-5 py-4">
					<SchemaBrowser {...browserProps} onReplaceSql={wrappedReplace} />
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
