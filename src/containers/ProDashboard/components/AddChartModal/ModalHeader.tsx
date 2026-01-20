import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { DashboardItemConfig } from '../../types'

interface ModalHeaderProps {
	editItem?: DashboardItemConfig | null
}

export function ModalHeader({ editItem }: ModalHeaderProps) {
	return (
		<div className="flex items-center justify-between">
			<h2 className="text-xl font-semibold pro-text1">{editItem ? 'Edit Item' : 'Add Item'}</h2>
			<Ariakit.DialogDismiss className="rounded-md pro-hover-bg p-1 pro-text3 transition-colors hover:pro-text1">
				<Icon name="x" height={20} width={20} />
				<span className="sr-only">Close dialog</span>
			</Ariakit.DialogDismiss>
		</div>
	)
}
