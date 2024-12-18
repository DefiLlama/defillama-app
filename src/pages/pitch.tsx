import { trim } from 'lodash'
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { maxAgeForNext } from '~/api'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'
import { fetchWithErrorLogging } from '~/utils/async'

const get = (url) => fetchWithErrorLogging(url).then((r) => r.json())

interface VC {
	name: string
	lastRound: number
	categories: Set<string>
	roundTypes: Set<string>
	chains: Set<string>
	numInvestments: number
	defiCategories: Set<string>
}

async function generateVCList(): Promise<VC[]> {
	const [raises, protocolsCategoryById] = await Promise.all([
		get('https://api.llama.fi/raises').then((r) => r.raises),
		get('https://api.llama.fi/protocols').then((protocols) =>
			protocols.reduce((acc, p) => {
				acc[p.id] = p.category
				return acc
			}, {})
		)
	])
	return Object.values(
		raises.reduce((acc, raise) => {
			const defiCategory = protocolsCategoryById[raise.defillamaId]
			const investors = raise.leadInvestors.concat(raise.otherInvestors)
			investors.forEach((vc) => {
				if (!acc[vc]) {
					acc[vc] = {
						name: vc,
						lastRound: raise.date,
						categories: new Set([raise.category]),
						roundTypes: new Set([raise.round]),
						chains: new Set(raise.chains),
						numInvestments: 1,
						defiCategories: new Set([defiCategory])
					}
				} else {
					acc[vc].lastRound = Math.max(acc[vc].lastRound, raise.date)
					acc[vc].categories.add(raise.category)
					acc[vc].roundTypes.add(raise.round)
					acc[vc].chains.add(...raise.chains)
					acc[vc].numInvestments += 1
					acc[vc].defiCategories.add(defiCategory)
				}
			})
			return acc
		}, {})
	)
}

export const getStaticProps = withPerformanceLogging('pitch', async () => {
	const vcList = await generateVCList()
	const categories = Array.from(new Set(vcList.flatMap((vc) => Array.from(vc.categories)?.filter(Boolean)?.map(trim))))
	const chains = Array.from(new Set(vcList.flatMap((vc) => Array.from(vc.chains)?.filter(Boolean))?.map(trim)))
	const defiCategories = Array.from(
		new Set(vcList.flatMap((vc) => Array.from(vc.defiCategories)?.filter(Boolean))?.map(trim))
	)
	const roundTypes = Array.from(new Set(vcList.flatMap((vc) => Array.from(vc.roundTypes)?.filter(Boolean))?.map(trim)))
	const lastRounds = vcList.map((vc) => vc.lastRound).sort((a, b) => b - a)

	return {
		props: {
			categories,
			chains,
			defiCategories,
			roundTypes,
			lastRounds: lastRounds.slice(0, 10)
		},
		revalidate: maxAgeForNext([22])
	}
})

const VCFilterPage = ({ categories, chains, defiCategories, roundTypes, lastRounds }) => {
	const [filters, setFilters] = useState({
		minimumInvestments: '',
		chains: [],
		roundTypes: [],
		defiCategories: [],
		categories: [],
		minLastRoundTime: ''
	})

	const [matchedInvestors, setMatchedInvestors] = useState(null)
	const [totalCost, setTotalCost] = useState(null)
	const [projectInfo, setProjectInfo] = useState({
		projectName: '',
		link: '',
		textPitch: '',
		founderEmail: ''
	})

	const [paymentLink, setPaymentLink] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const chainOptions = chains.map((chain) => ({ value: chain, label: chain }))
	const roundTypeOptions = roundTypes.map((type) => ({ value: type, label: type }))
	const defiCategoryOptions = defiCategories.map((category) => ({ value: category, label: category }))
	const categoryOptions = categories.map((category) => ({ value: category, label: category }))
	const hasSelectedFilters = Object.values(filters).some((v) => (Number.isInteger(v) ? true : v?.length))

	const unixToDateString = (unixTimestamp) => {
		if (!unixTimestamp) return ''
		const date = new Date(unixTimestamp * 1000)
		return date.toISOString().split('T')[0]
	}

	const dateStringToUnix = (dateString) => {
		if (!dateString) return ''
		return Math.floor(new Date(dateString).getTime() / 1000)
	}

	const handleDateChange = (e) => {
		const dateString = e.target.value
		const unixTimestamp = dateStringToUnix(dateString)
		handleFilterChange('minLastRoundTime', unixTimestamp)
	}

	const handleFilterChange = (name, value) => {
		setFilters((prevFilters) => ({ ...prevFilters, [name]: value }))
	}

	const handleProjectInfoChange = (e) => {
		const { name, value } = e.target
		setProjectInfo((prevInfo) => ({ ...prevInfo, [name]: value }))
	}

	const fetchInvestors = async (filters) => {
		const body = Object.fromEntries(Object.entries(filters).filter(([_, v]: any) => v && v.length !== 0))

		const response = await fetch('https://vc-emails.llama.fi/vc-list', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ filters: body })
		})

		const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
		await wait(500)

		if (!response.ok) {
			throw new Error('Network response was not ok')
		}

		return response.json()
	}

	const useInvestorsQuery = (filters, hasSelectedFilters) => {
		return useQuery({
			queryKey: ['investors', filters],
			queryFn: () => fetchInvestors(filters),
			enabled: hasSelectedFilters,
			staleTime: 60 * 60 * 1000
		})
	}

	const { isLoading } = useInvestorsQuery(filters, hasSelectedFilters)

	const handleSubmit = async (e) => {
		e.preventDefault()
		setIsSubmitting(true)
		try {
			const filtersData = Object.fromEntries(Object.entries(filters).filter(([_, v]: any) => v && v.length !== 0))
			const response = await fetch('https://vc-emails.llama.fi/new-payment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...projectInfo, filters: filtersData })
			})
			const data = await response.json()
			window.open(data.link, '_blank')
			setPaymentLink(data.link)
		} catch (error) {
			console.error('Error creating payment:', error)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Layout title="VC Filter - DefiLlama" defaultSEO>
			<div className="w-full max-w-4xl mx-auto rounded-md bg-[var(--bg1)] shadow p-5 flex flex-col gap-5">
				<h1 className="text-2xl font-medium text-center">Connect with Investors</h1>
				<p className="text-base text-center text-[var(--text2)]">
					Filter a list of VCs by their investments in DeFi projects to connect with the right investors for your
					project.
				</p>
				<div className="flex flex-col lg:flex-row gap-10 relative">
					<div className="flex-1 flex flex-col gap-4">
						<h2 className="text-2xl">Filter Investors</h2>

						<label className="flex flex-col gap-1 text-sm">
							<span className="font-medium">Categories:</span>
							<ReactSelect
								isMulti
								options={categoryOptions}
								value={filters.categories.map((category) => ({ value: category, label: category }))}
								onChange={(selected: Record<string, string>[]) =>
									handleFilterChange(
										'categories',
										selected.map((s) => s.value)
									)
								}
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm">
							<span className="font-medium">DeFi Categories:</span>
							<ReactSelect
								isMulti
								options={defiCategoryOptions}
								value={filters.defiCategories.map((category) => ({ value: category, label: category }))}
								onChange={(selected: Record<string, string>[]) =>
									handleFilterChange(
										'defiCategories',
										selected.map((s) => s.value)
									)
								}
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm">
							<span className="font-medium">Round Types:</span>
							<ReactSelect
								isMulti
								options={roundTypeOptions}
								value={filters.roundTypes.map((round) => ({ value: round, label: round }))}
								onChange={(selected: Record<string, string>[]) =>
									handleFilterChange(
										'roundTypes',
										selected.map((s) => s.value)
									)
								}
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm">
							<span className="font-medium">Chains:</span>
							<ReactSelect
								isMulti
								options={chainOptions}
								value={filters.chains.map((chain) => ({ value: chain, label: chain }))}
								onChange={(selected: Record<string, string>[]) =>
									handleFilterChange(
										'chains',
										selected.map((s) => s.value)
									)
								}
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm">
							<span className="font-medium">Minimum last investment time:</span>
							<input
								type="date"
								className="p-[6px] rounded-md text-base bg-white text-black dark:bg-black dark:text-white border border-black/10 dark:border-white/10"
								value={unixToDateString(filters.minLastRoundTime)}
								onChange={handleDateChange}
								max={new Date().toISOString().split('T')[0]}
								onFocus={async (e) => {
									try {
										e.target.showPicker()
									} catch (error) {}
								}}
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm">
							<span className="font-medium">Minimum number of investments:</span>
							<input
								type="number"
								value={filters.minimumInvestments}
								onChange={(e) => handleFilterChange('minimumInvestments', parseInt(e.target.value))}
								className="p-[6px] rounded-md text-base bg-white text-black dark:bg-black dark:text-white border border-black/10 dark:border-white/10"
							/>
						</label>

						<h2 className="text-2xl">Project Information</h2>

						<form onSubmit={handleSubmit} className="flex flex-col gap-4">
							<label className="flex flex-col gap-1 text-sm">
								<span className="font-medium">Project Name:</span>
								<input
									type="text"
									name="projectName"
									value={projectInfo.projectName}
									onChange={handleProjectInfoChange}
									required
									className="p-[6px] rounded-md text-base bg-white text-black dark:bg-black dark:text-white border border-black/10 dark:border-white/10"
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span className="font-medium">Link for further info:</span>
								<input
									name="link"
									value={projectInfo.link}
									onChange={handleProjectInfoChange}
									className="p-[6px] rounded-md text-base bg-white text-black dark:bg-black dark:text-white border border-black/10 dark:border-white/10"
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span className="font-medium">Short Pitch:</span>
								<textarea
									name="textPitch"
									value={projectInfo.textPitch}
									onChange={handleProjectInfoChange}
									required
									className="p-[6px] rounded-md text-base bg-white text-black dark:bg-black dark:text-white border border-black/10 dark:border-white/10"
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span className="font-medium">Founder Email:</span>
								<input
									type="email"
									name="founderEmail"
									value={projectInfo.founderEmail}
									onChange={handleProjectInfoChange}
									required
									className="p-[6px] rounded-md text-base bg-white text-black dark:bg-black dark:text-white border border-black/10 dark:border-white/10"
								/>
							</label>
							<button
								type="submit"
								disabled={isSubmitting}
								className="bg-[var(--primary1)] disabled:bg-[var(--bg3)] text-white disabled:text-[var(--text3)] py-2 px-6 rounded-md w-full text-lg font-semibold"
							>
								{isSubmitting ? 'Submitting...' : 'Submit'}
							</button>
						</form>
					</div>
					<div className="w-full max-w-xs lg:sticky lg:top-10 flex flex-col gap-2 shadow h-fit p-4 rounded-md bg-[var(--bg2)]">
						<h2>Results</h2>
						{isLoading ? <div className="absolute top-0 left-0 h-1 w-[30%] bg-[#3498db] animate-linebeat" /> : null}

						<p className="text-base flex items-center flex-wrap gap-1 justify-between">
							<span>Matched Investors:</span>{' '}
							<span className="font-semibold">{hasSelectedFilters ? matchedInvestors || '0' : '0'}</span>
						</p>
						<p className="text-base flex items-center flex-wrap gap-1 justify-between">
							<span>Total Cost:</span>
							{matchedInvestors && hasSelectedFilters ? (
								<span className="font-semibold text-[var(--green1)]">${totalCost}</span>
							) : (
								<span className="font-semibold">0</span>
							)}
						</p>
						{matchedInvestors > 100 && hasSelectedFilters ? (
							<p className="text-red-500">To reduce costs, please filter further.</p>
						) : null}
						{paymentLink ||
							(true && (
								<>
									<button
										onClick={() => window.open(paymentLink, '_blank')}
										disabled={isSubmitting}
										className="bg-[var(--primary1)] disabled:bg-[var(--bg3)] text-white disabled:text-[var(--text3)] py-2 px-6 rounded-md w-full text-lg font-semibold"
									>
										{isSubmitting ? 'Processing...' : 'Go to Payment'}
									</button>
								</>
							))}
					</div>
				</div>
			</div>
		</Layout>
	)
}

const QueryProviderWrapper = (props) => {
	return <VCFilterPage {...props} />
}

export default QueryProviderWrapper
