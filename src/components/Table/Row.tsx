import * as React from 'react'
import { v4 as uuid } from 'uuid'
import { Cell, RowWrapper } from './shared'
import type { IRowProps } from './types'

export function Row(props: IRowProps) {
	const { columns, item, index } = props

	return (
		<>
			{item.subRows ? (
				<RowWithExtras {...props} />
			) : (
				<RowWrapper>
					{columns.map((col) => (
						<Cell key={uuid()}>
							{col.Cell ? (
								<col.Cell value={item[col.accessor]} rowValues={item} rowIndex={index} />
							) : (
								item[col.accessor]
							)}
						</Cell>
					))}
				</RowWrapper>
			)}
		</>
	)
}

export function RowWithExtras({ columns, item, index }: IRowProps) {
	const [displayRows, setDisplay] = React.useState(false)

	return (
		<>
			<RowWrapper style={{ cursor: 'pointer' }} onClick={() => setDisplay(!displayRows)}>
				{columns.map((col) => (
					<Cell key={uuid()}>
						{col.Cell ? (
							<col.Cell
								value={item[col.accessor]}
								rowValues={item}
								rowIndex={index}
								rowType="accordion"
								showRows={displayRows}
							/>
						) : (
							item[col.accessor]
						)}
					</Cell>
				))}
			</RowWrapper>
			{displayRows &&
				item.subRows.map((subRow) => (
					<RowWrapper key={uuid()}>
						{columns.map((col) => (
							<Cell key={uuid()}>
								{col.Cell ? (
									<col.Cell value={subRow[col.accessor]} rowValues={subRow} rowType="child" />
								) : (
									subRow[col.accessor]
								)}
							</Cell>
						))}
					</RowWrapper>
				))}
		</>
	)
}
