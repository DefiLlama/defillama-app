import * as React from 'react'
import { Menu } from '~/components/DropdownMenu'
import HeadHelp from '~/components/HeadHelp'

interface IProps {
	audits: number | string
	auditLinks: string[]
	color?: string
	isLoading?: boolean
}

export const AuditInfo = ({ audits, auditLinks = [], color, isLoading, ...props }: IProps) => {
	return (
		<section className="flex items-center gap-2" {...props}>
			<HeadHelp title="Audits" text="Audits are not a guarantee of security." />
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
