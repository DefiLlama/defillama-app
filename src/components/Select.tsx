import * as Ariakit from '@ariakit/react'
import * as React from 'react'
import { NestedMenu, NestedMenuItem } from './NestedMenu'
import { Tooltip } from './Tooltip'
import { Icon } from './Icon'

interface ISelect {
	allValues: Array<{ key: string; name: string; help?: string }> | Array<string>
	selectedValues: Array<string>
	setSelectedValues: React.Dispatch<React.SetStateAction<Array<string>>>
	label: string
	clearAll?: () => void
	toggleAll?: () => void
	selectOnlyOne?: (value: string) => void
	nestedMenu?: boolean
	labelType?: 'regular' | 'smol' | 'none'
	triggerProps?: Ariakit.SelectProps
}

export function Select({
	allValues,
	selectedValues,
	setSelectedValues,
	label,
	clearAll,
	toggleAll,
	selectOnlyOne,
	nestedMenu,
	labelType = 'regular',
	triggerProps
}: ISelect) {
	const valuesAreAnArrayOfStrings = typeof allValues[0] === 'string'

	const [viewableMatches, setViewableMatches] = React.useState(20)

	if (nestedMenu) {
		return (
			<Ariakit.SelectProvider
				value={selectedValues}
				setValue={(values) => {
					setSelectedValues(values)
				}}
			>
				<NestedMenu label={label} render={<Ariakit.Select />}>
					{clearAll || toggleAll ? (
						<span className="sticky z-[1] top-0 flex flex-wrap justify-between gap-1 bg-[var(--bg1)] text-[var(--link)] text-xs border-b border-[var(--form-control-border)]">
							{clearAll ? (
								<button onClick={clearAll} className="p-3">
									Clear
								</button>
							) : null}
							{toggleAll ? (
								<button onClick={toggleAll} className="p-3">
									Toggle all
								</button>
							) : null}
						</span>
					) : null}
					{allValues.slice(0, viewableMatches + 1).map((option) => (
						<NestedMenuItem
							key={valuesAreAnArrayOfStrings ? option : option.key}
							render={<Ariakit.SelectItem value={valuesAreAnArrayOfStrings ? option : option.key} />}
							hideOnClick={false}
							className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] data-[active-item]:bg-[var(--primary1-hover)] cursor-pointer last-of-type:rounded-b-md border-b border-[var(--form-control-border)]"
						>
							{valuesAreAnArrayOfStrings ? (
								<span>{option}</span>
							) : option.help ? (
								<Tooltip content={option.help}>
									<span className="mr-1">{option.name}</span>
									<Icon name="help-circle" height={15} width={15} />
								</Tooltip>
							) : (
								<span>{option.name}</span>
							)}
							<Ariakit.SelectItemCheck className="h-3 w-3 flex items-center justify-center rounded-sm flex-shrink-0 border border-[#28a2b5]" />
						</NestedMenuItem>
					))}
					{allValues.length > viewableMatches ? (
						<button
							className="w-full py-4 px-3 text-[var(--link)] hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)]"
							onClick={() => setViewableMatches((prev) => prev + 20)}
						>
							See more...
						</button>
					) : null}
				</NestedMenu>
			</Ariakit.SelectProvider>
		)
	}

	return (
		<Ariakit.SelectProvider
			value={selectedValues}
			setValue={(values) => {
				setSelectedValues(values)
			}}
		>
			<Ariakit.Select
				className="bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-2 py-2 px-3 text-xs rounded-md cursor-pointer text-[var(--text1)] flex-nowrap"
				{...triggerProps}
			>
				{labelType === 'smol' ? (
					<span className="flex items-center gap-1">
						<span className="text-[10px] -my-2 rounded-full min-w-4 flex items-center justify-center bg-[var(--bg4)] p-[1px]">
							{selectedValues.length}
						</span>
						<span>{label}</span>
					</span>
				) : labelType === 'regular' && selectedValues.length > 0 ? (
					<>
						<span>{label}: </span>
						<span className="text-[var(--link)]">
							{selectedValues.length > 2
								? `${selectedValues[0]} + ${selectedValues.length - 1} others`
								: selectedValues.join(', ')}
						</span>
					</>
				) : (
					<span>{label}</span>
				)}
				<Ariakit.SelectArrow />
			</Ariakit.Select>
			<Ariakit.SelectPopover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				wrapperProps={{
					className: 'max-sm:!fixed max-sm:!bottom-0 max-sm:!top-[unset] max-sm:!transform-none max-sm:!w-full'
				}}
				className="flex flex-col bg-[var(--bg1)] rounded-md max-sm:rounded-b-none z-10 overflow-auto overscroll-contain min-w-[180px] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
			>
				{allValues.length > 0 ? (
					<>
						{clearAll || toggleAll ? (
							<span className="sticky z-[1] top-0 flex flex-wrap justify-between gap-1 bg-[var(--bg1)] text-[var(--link)] text-xs border-b border-[var(--form-control-border)]">
								{clearAll ? (
									<button onClick={clearAll} className="p-3">
										Clear
									</button>
								) : null}
								{toggleAll ? (
									<button onClick={toggleAll} className="p-3">
										Toggle all
									</button>
								) : null}
							</span>
						) : null}

						{allValues.slice(0, viewableMatches + 1).map((option) => (
							<Ariakit.SelectItem
								key={`${label}-${valuesAreAnArrayOfStrings ? option : option.key}`}
								value={valuesAreAnArrayOfStrings ? option : option.key}
								className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] data-[active-item]:bg-[var(--primary1-hover)] cursor-pointer last-of-type:rounded-b-md border-b border-[var(--form-control-border)]"
							>
								{valuesAreAnArrayOfStrings ? (
									<span>{option}</span>
								) : option.help ? (
									<Tooltip content={option.help}>
										<span className="mr-1">{option.name}</span>
										<Icon name="help-circle" height={15} width={15} />
									</Tooltip>
								) : (
									<span>{option.name}</span>
								)}
								{selectOnlyOne ? (
									<button
										onClick={(e) => {
											e.stopPropagation()
											selectOnlyOne(valuesAreAnArrayOfStrings ? option : option.key)
										}}
										className="font-medium text-xs text-[var(--link)] underline hidden group-hover:inline-block group-focus-visible:inline-block"
									>
										Only
									</button>
								) : null}
								<Ariakit.SelectItemCheck className="h-3 w-3 flex items-center justify-center rounded-sm flex-shrink-0 border border-[#28a2b5]" />
							</Ariakit.SelectItem>
						))}

						{allValues.length > viewableMatches ? (
							<button
								className="w-full py-4 px-3 text-[var(--link)] hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)]"
								onClick={() => setViewableMatches((prev) => prev + 20)}
							>
								See more...
							</button>
						) : null}
					</>
				) : (
					<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
				)}
			</Ariakit.SelectPopover>
		</Ariakit.SelectProvider>
	)
}
