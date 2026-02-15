import * as React from 'react'
import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { Flag } from './Flag'

// oxlint-disable-next-line no-unused-vars
const RowWithSubRows = ({
	subRows,
	protocolName,
	dataType,
	rowHeader,
	rowValue,
	helperText
}: {
	subRows: React.ReactNode
	protocolName?: string
	dataType?: string
	rowHeader: React.ReactNode
	rowValue: React.ReactNode
	helperText?: string
}) => {
	const [open, setOpen] = useState(false)
	return (
		<>
			<tr className="group">
				<th className="flex items-center gap-1 text-left font-normal text-(--text-label)">
					<button onClick={() => setOpen(!open)} className="flex items-center gap-0.5 whitespace-nowrap">
						{helperText ? (
							<Tooltip content={helperText} className="whitespace-nowrap underline decoration-dotted">
								{rowHeader}
							</Tooltip>
						) : (
							<span className="whitespace-nowrap">{rowHeader}</span>
						)}
						<Icon
							name="chevron-down"
							height={16}
							width={16}
							className="relative top-0.5 transition-transform duration-100 group-open:rotate-180"
						/>
					</button>
					{protocolName && dataType ? (
						<Flag
							protocol={protocolName}
							dataType={dataType}
							className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
						/>
					) : null}
				</th>
				<td className="text-right font-jetbrains">{rowValue}</td>
			</tr>

			{open && <>{subRows}</>}
		</>
	)
}
