import { Toaster } from 'react-hot-toast'

export function Toast() {
	return (
		<Toaster
			position="top-center"
			toastOptions={{
				style: {
					background: 'var(--cards-bg)',
					color: 'var(--text-primary)',
					border: '1px solid var(--cards-border)',
					borderRadius: '8px',
					fontSize: '14px'
				},
				success: {
					iconTheme: {
						primary: 'var(--success)',
						secondary: 'var(--bg-card)'
					}
				},
				error: {
					iconTheme: {
						primary: 'var(--error)',
						secondary: 'var(--bg-card)'
					}
				}
			}}
		/>
	)
}
