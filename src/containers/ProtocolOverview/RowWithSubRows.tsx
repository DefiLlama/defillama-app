import { Icon } from '~/components/Icon'
import { Flag } from './Flag'
import { useState } from 'react'
import { Tooltip } from '~/components/Tooltip'

export const RowWithSubRows = ({ subRows, protocolName, dataType, rowHeader, rowValue, helperText }) => {
	const [open, setOpen] = useState(false)
	return (
		<>
			<tr className="group">
				<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left flex items-center gap-1">
					<button onClick={() => setOpen(!open)} className="ml-[-18px] flex items-center gap-[2px] whitespace-nowrap">
						<Icon
							name="chevron-right"
							height={16}
							width={16}
							data-open={open}
							className="data-[open=true]:rotate-90 transition-transform duration-100 flex-shrink-0"
						/>
						{helperText ? (
							<Tooltip content={helperText} className="underline decoration-dotted whitespace-nowrap">
								{rowHeader}
							</Tooltip>
						) : (
							<span className="whitespace-nowrap">{rowHeader}</span>
						)}
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
