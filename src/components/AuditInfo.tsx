import { Icon } from '~/components/Icon'
import { Menu } from '~/components/Menu'
import { Tooltip } from '~/components/Tooltip'

interface IProps {
	audits: number | string
	auditLinks: string[]
	color?: string
	isLoading?: boolean
}

export const AuditInfo = ({ audits, auditLinks = [], color, isLoading, ...props }: IProps) => {
	return (
		<section className="flex items-center gap-2 *:last:text-xs *:last:font-medium" {...props}>
			<Tooltip content={'Audits are not a guarantee of security.'}>
				<span>Audits</span>
				<Icon name="help-circle" height={15} width={15} />
			</Tooltip>
			<span>:</span>
			<span className="flex items-center min-h-6">
				{isLoading ? null : +audits > 0 ? (
					<Menu
						name="Yes"
						options={auditLinks}
						color={color}
						isExternal
						className="bg-(--btn2-bg) hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg) flex items-center justify-between gap-2 py-1 px-3 rounded-md cursor-pointer text-(--text1) flex-nowrap relative max-w-fit"
					/>
				) : (
					<span>No</span>
				)}
			</span>
		</section>
	)
}
