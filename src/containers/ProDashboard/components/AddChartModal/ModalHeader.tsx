import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { DashboardItemConfig } from '../../types'

interface ModalHeaderProps {
	editItem?: DashboardItemConfig | null
}

export function ModalHeader({ editItem }: ModalHeaderProps) {
	return (
		<div className="mb-6 flex items-center justify-between">
			<h2 className="pro-text1 text-xl font-semibold">{editItem ? 'Edit Item' : 'Add Item'}</h2>
			<Ariakit.DialogDismiss className="pro-hover-bg pro-text3 hover:pro-text1 rounded-md p-1 transition-colors">
				<Icon name="x" height={20} width={20} />
				<span className="sr-only">Close dialog</span>
			</Ariakit.DialogDismiss>
		</div>
	)
}
