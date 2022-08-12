import * as React from 'react'
import styled from 'styled-components'
import { Menu } from '~/components/DropdownMenu'
import HeadHelp from '~/components/HeadHelp'

const Audits = styled.section`
	display: flex;
	align-items: center;
	gap: 8px;
`

const Info = styled.span`
	min-height: 32px;
	display: flex;
	align-items: center;
`

interface IProps {
	audits: number | string
	auditLinks: string[]
	color?: string
	isLoading?: boolean
}

const AuditInfo = ({ audits, auditLinks = [], color, isLoading, ...props }: IProps) => {
	return (
		<Audits {...props}>
			<HeadHelp title="Audits" text="Audits are not a guarantee of security." />
			<span>:</span>
			<Info>
				{isLoading ? null : audits > 0 ? (
					<Menu name="Yes" options={auditLinks} color={color} isExternal />
				) : (
					<span>No</span>
				)}
			</Info>
		</Audits>
	)
}

export default AuditInfo
