import toast, { Toaster } from 'react-hot-toast'
import { Icon } from './Icon'

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

export const ErrorToast = ({ title, description }) => {
	return (
		<div className="flex flex-col gap-2">
			<p className="flex items-center gap-2 text-base font-semibold text-[#B53B35] dark:text-[#E24A42]">
				<Icon name="alert-triangle" height={16} width={16} />
				<span>{title}</span>
			</p>
			<p className="text-[#484848] dark:text-[#C6C6C6]">{description}</p>
		</div>
	)
}

export function errorToast({ title, description }: { title: string; description: string }) {
	return toast.error(
		(t) => (
			<div className="flex flex-col gap-2">
				<p className="flex items-center gap-2 text-base font-semibold text-[#B53B35] dark:text-[#E24A42]">
					<Icon name="alert-triangle" height={16} width={16} />
					<span>{title}</span>
					<button onClick={() => toast.dismiss(t.id)} className="ml-auto text-black dark:text-white">
						<Icon name="circle-x" height={16} width={16} />

						<span className="sr-only">Close</span>
					</button>
				</p>
				<p className="text-[#484848] dark:text-[#C6C6C6]">{description}</p>
			</div>
		),
		{
			position: 'top-right',
			icon: null,
			style: {
				padding: '12px'
			}
		}
	)
}
