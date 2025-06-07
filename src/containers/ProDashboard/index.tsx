import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { AddChartModal } from './components/AddChartModal'
import { ChartGrid } from './components/ChartGrid'
import { EmptyState } from './components/EmptyState'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { useSubscribe } from '~/hooks/useSubscribe'
import { LoadingSpinner } from './components/LoadingSpinner'
import { ProDashboardProvider, useProDashboard, TimePeriod } from './ProDashboardContext'

function ProDashboardContent() {
	const [showAddModal, setShowAddModal] = useState<boolean>(false)
	const [isEditingName, setIsEditingName] = useState<boolean>(false)
	const { subscription, isLoading: isSubLoading } = useSubscribe()
	const { items, protocolsLoading, timePeriod, setTimePeriod, dashboardName, setDashboardName } = useProDashboard()

	const timePeriods: { value: TimePeriod; label: string }[] = [
		{ value: '30d', label: '30d' },
		{ value: '90d', label: '90d' },
		{ value: '365d', label: '365d' },
		{ value: 'all', label: 'All' }
	]

	const handleNameSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		setIsEditingName(false)
	}

	const handleNameKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			setIsEditingName(false)
		} else if (e.key === 'Escape') {
			setIsEditingName(false)
		}
	}

	if (isSubLoading) {
		return (
			<div className="flex justify-center items-center h-[40vh]">
				<LoadingSpinner />
			</div>
		)
	}

	if (subscription?.status !== 'active') {
		return (
			<div className="flex flex-col items-center justify-center w-full px-4 py-10">
				<div className="mb-10 text-center w-full max-w-3xl">
					<h2 className="text-3xl font-extrabold text-white mb-3">Unlock the Full Picture</h2>
					<p className="text-[#b4b7bc] text-lg mb-4">
						The Pro Dashboard offers dynamic, customizable charts. Here's a sneak peek of what you can explore with a
						Llama+ subscription:
					</p>
				</div>

				<SubscribePlusCard context="modal" />
			</div>
		)
	}

	return (
		<div className="p-4 md:p-6">
			<div className="grid grid-cols-3 items-center mb-2 gap-4">
				<div className="grid grid-cols-4 gap-0 justify-self-start">
					{timePeriods.map((period) => (
						<button
							key={period.value}
							className={`px-4 py-2 text-sm font-medium border transition-colors duration-200 ${
								timePeriod === period.value
									? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
									: 'border-white/20 hover:bg-[var(--bg3)] text-[var(--text2)]'
							}`}
							onClick={() => setTimePeriod(period.value)}
						>
							{period.label}
						</button>
					))}
				</div>

				<div className="justify-self-center">
					{isEditingName ? (
						<form onSubmit={handleNameSubmit} className="flex items-center">
							<input
								type="text"
								value={dashboardName}
								onChange={(e) => setDashboardName(e.target.value)}
								onBlur={() => setIsEditingName(false)}
								onKeyDown={handleNameKeyDown}
								className="text-xl font-semibold text-center bg-transparent border-b-2 border-[var(--primary1)] text-[var(--text1)] focus:outline-none px-3 py-2 min-w-0"
								autoFocus
								placeholder="Dashboard Name"
							/>
						</form>
					) : (
						<button
							onClick={() => setIsEditingName(true)}
							className="group text-xl font-semibold text-[var(--text1)] px-3 py-2 hover:bg-[var(--bg3)] border border-transparent hover:border-[var(--form-control-border)] flex items-center gap-2"
						>
							{dashboardName}
							<Icon name="pencil" height={14} width={14} className="text-[var(--text1)]" />
						</button>
					)}
				</div>

				<button
					className="px-4 py-2 bg-[var(--primary1)] text-white flex items-center gap-2 hover:bg-[var(--primary1-hover)] justify-self-end"
					onClick={() => setShowAddModal(true)}
				>
					<Icon name="plus" height={16} width={16} />
					Add Item
				</button>
			</div>

			{protocolsLoading && items.length === 0 && (
				<div className="flex items-center justify-center h-40">
					<LoadingSpinner />
				</div>
			)}

			{items.length > 0 && <ChartGrid onAddChartClick={() => setShowAddModal(true)} />}

			<AddChartModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

			{!protocolsLoading && items.length === 0 && <EmptyState onAddChart={() => setShowAddModal(true)} />}
		</div>
	)
}

export default function ProDashboard() {
	return (
		<ProDashboardProvider>
			<ProDashboardContent />
		</ProDashboardProvider>
	)
}
