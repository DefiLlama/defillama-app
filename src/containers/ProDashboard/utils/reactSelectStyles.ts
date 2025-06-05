export const reactSelectStyles = {
	control: (provided: any, state: any) => ({
		...provided,
		backgroundColor: '#070e0f',
		border: '1px solid rgba(255, 255, 255, 0.2)',
		borderRadius: 0,
		minHeight: '40px',
		boxShadow: 'none',
		'&:hover': {
			border: '1px solid rgba(255, 255, 255, 0.2)'
		},
		...(state.isFocused && {
			border: '1px solid var(--primary1)',
			'&:hover': {
				border: '1px solid var(--primary1)'
			}
		})
	}),
	menu: (provided: any) => ({
		...provided,
		backgroundColor: '#070e0f',
		border: '1px solid rgba(255, 255, 255, 0.2)',
		borderRadius: 0,
		boxShadow: 'none'
	}),
	menuList: (provided: any) => ({
		...provided,
		padding: 0,
		backgroundColor: '#070e0f'
	}),
	option: (provided: any, state: any) => ({
		...provided,
		backgroundColor: state.isSelected ? 'var(--primary1)' : state.isFocused ? 'var(--bg2)' : 'transparent',
		color: state.isSelected ? 'white' : 'var(--text1)',
		padding: '8px 12px',
		'&:hover': {
			backgroundColor: state.isSelected ? 'var(--primary1)' : 'var(--bg2)'
		}
	}),
	singleValue: (provided: any) => ({
		...provided,
		color: 'var(--text1)'
	}),
	placeholder: (provided: any) => ({
		...provided,
		color: 'var(--text3)'
	}),
	input: (provided: any) => ({
		...provided,
		color: 'var(--text1)'
	}),
	indicatorSeparator: () => ({
		display: 'none'
	}),
	dropdownIndicator: (provided: any) => ({
		...provided,
		color: 'var(--text3)',
		'&:hover': {
			color: 'var(--text1)'
		}
	})
}
