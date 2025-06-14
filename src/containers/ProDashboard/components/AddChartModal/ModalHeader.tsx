import { Icon } from '~/components/Icon'
import { DashboardItemConfig } from '../../types'

interface ModalHeaderProps {
	editItem?: DashboardItemConfig | null
	onClose: () => void
}

export function ModalHeader({ editItem, onClose }: ModalHeaderProps) {
	return (
		<div className="flex items-center justify-between mb-6">
			<h2 className="text-xl font-semibold pro-text1">
				{editItem ? 'Edit Item' : 'Add Item'}
			</h2>
			<button
				onClick={onClose}
				className="p-1.5 pro-hover-bg pro-text3 hover:pro-text1 rounded-md transition-colors"
			>
				<Icon name="x" height={20} width={20} />
			</button>
		</div>
	)
}