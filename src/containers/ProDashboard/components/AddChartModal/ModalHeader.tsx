import { Icon } from '~/components/Icon'
import { DashboardItemConfig } from '../../types'

interface ModalHeaderProps {
	editItem?: DashboardItemConfig | null
	onClose: () => void
}

export function ModalHeader({ editItem, onClose }: ModalHeaderProps) {
	return (
		<div className="mb-4 flex items-center justify-between md:mb-6">
			<h2 className="pro-text1 text-lg font-semibold md:text-xl">{editItem ? 'Edit Item' : 'Add Item'}</h2>
			<button
				onClick={onClose}
				className="pro-hover-bg pro-text3 hover:pro-text1 rounded-md p-2 transition-colors md:p-1.5"
			>
				<Icon name="x" height={24} width={24} className="md:h-5 md:w-5" />
			</button>
		</div>
	)
}
