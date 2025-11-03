import React from 'react'
import { getItemIconUrl } from '../utils'

interface OptionProps {
	innerProps: any
	label: string
	data: { logo?: string; value: string; isChild?: boolean; id?: string }
	isFocused?: boolean
	isSelected?: boolean
}

export function ProtocolOption({ innerProps, label, data, isFocused, isSelected }: OptionProps) {
	const isChild = !!data.isChild
	const iconSize = isChild ? 18 : 20
	const iconUrl = getItemIconUrl('protocol', data, data.value)
	return (
		<div
			{...innerProps}
			style={{
				display: 'flex',
				alignItems: 'center',
				padding: '8px',
				cursor: 'pointer',
				paddingLeft: isChild ? 40 : 10,
				marginLeft: isChild ? 0 : 0,
				marginRight: 4,
				backgroundColor: isSelected ? 'var(--primary)' : isFocused ? 'var(--bg-tertiary)' : 'transparent',
				transition: 'background-color 0.15s ease',
				position: 'relative'
			}}
		>
			{isChild && (
				<div
					style={{
						position: 'absolute',
						left: 28,
						top: '50%',
						transform: 'translateY(-50%)',
						width: 4,
						height: 4,
						borderRadius: '50%',
						backgroundColor: 'var(--pro-text3)',
						opacity: 0.6
					}}
				/>
			)}
			{data.logo ? (
				<img
					src={data.logo}
					alt={label}
					style={{ width: iconSize, height: iconSize, marginRight: 10, borderRadius: '50%', opacity: 1 }}
				/>
			) : (
				<img
					src={iconUrl}
					alt={label}
					style={{
						width: iconSize,
						height: iconSize,
						marginRight: 10,
						borderRadius: '50%',
						opacity: isChild ? 0.85 : 1
					}}
					onError={(e) => {
						const target = e.target as HTMLImageElement
						target.style.display = 'none'
						const placeholder = target.nextElementSibling as HTMLElement
						if (placeholder) {
							placeholder.style.display = 'flex'
						}
					}}
				/>
			)}
			<div
				style={{
					width: iconSize,
					height: iconSize,
					marginRight: 10,
					borderRadius: '50%',
					backgroundColor: 'var(--bg2)',
					display: data.logo ? 'none' : 'none'
				}}
			/>
			<span
				style={{
					fontWeight: isChild ? 400 : 500,
					color: isSelected ? 'white' : isChild ? 'var(--pro-text2)' : 'var(--pro-text1)',
					fontSize: isChild ? '0.95em' : '1em'
				}}
			>
				{label}
			</span>
		</div>
	)
}
