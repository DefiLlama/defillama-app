import * as React from 'react'
import { Menu } from '~/components/DropdownMenu'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'

interface IProps {
	audits: number | string
	auditLinks: string[]
	color?: string
	isLoading?: boolean
}

export const AuditInfo = ({ audits, auditLinks = [], color, isLoading, ...props }: IProps) => {
	return (
		<section className="flex items-center gap-2" {...props}>
			<Tooltip content={'Audits are not a guarantee of security.'}>
				<span>Audits</span>
				<Icon name="help-circle" height={15} width={15} />
			</Tooltip>
			<span>:</span>
			<span className="flex items-center min-h-8">
				{isLoading ? null : +audits > 0 ? (
					<Menu name="Yes" options={auditLinks} color={color} isExternal />
				) : (
					<span>No</span>
				)}
			</span>
		</section>
	)
}
