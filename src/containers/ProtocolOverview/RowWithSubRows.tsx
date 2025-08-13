import { Icon } from '~/components/Icon'
import { Flag } from './Flag'
import { useState } from 'react'
import { Tooltip } from '~/components/Tooltip'

export const RowWithSubRows = ({ subRows, protocolName, dataType, rowHeader, rowValue, helperText }) => {
	const [open, setOpen] = useState(false)
	return (
		<>
			<tr className="group">
				<th className="text-(--text-label) font-normal text-left flex items-center gap-1">
					<button onClick={() => setOpen(!open)} className="flex items-center gap-[2px] whitespace-nowrap">
						{helperText ? (
							<Tooltip content={helperText} className="underline decoration-dotted whitespace-nowrap">
								{rowHeader}
							</Tooltip>
						) : (
							<span className="whitespace-nowrap">{rowHeader}</span>
						)}
						<Icon
							name="chevron-down"
							height={16}
							width={16}
							className="group-open:rotate-180 transition-transform duration-100 relative top-[2px]"
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
				<td className="font-jetbrains text-right">{rowValue}</td>
			</tr>

			{open && <>{subRows}</>}
		</>
	)
}
