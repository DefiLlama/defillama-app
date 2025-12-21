import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { maxAgeForNext } from '~/api'
import Layout from '~/layout'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

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
		fetchJson('https://api.llama.fi/raises').then((r) => r.raises),
		fetchJson('https://api.llama.fi/protocols').then((protocols) =>
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
	return { notFound: true }
	const vcList = await generateVCList()
	const categories = Array.from(
		new Set(
			vcList.flatMap((vc) =>
				Array.from(vc.categories)
					?.filter(Boolean)
					?.map((x) => x.trim())
			)
		)
	)
	const chains = Array.from(
		new Set(vcList.flatMap((vc) => Array.from(vc.chains)?.filter(Boolean))?.map((x) => x.trim()))
	)
	const defiCategories = Array.from(
		new Set(vcList.flatMap((vc) => Array.from(vc.defiCategories)?.filter(Boolean))?.map((x) => x.trim()))
	)
	const roundTypes = Array.from(
		new Set(vcList.flatMap((vc) => Array.from(vc.roundTypes)?.filter(Boolean))?.map((x) => x.trim()))
	)
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
			staleTime: 60 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: 0
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
			window.location.href = data.link
			setPaymentLink(data.link)
		} catch (error) {
			console.log('Error creating payment:', error)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Layout
			title="VC Filter - DefiLlama"
			description={`Pitch your project to VCs by filtering them by their investments in DeFi projects. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords=""
			canonicalUrl={`/pitch`}
		>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-5 rounded-md bg-(--cards-bg) p-3">
				<h1 className="text-center text-xl font-semibold">Connect with Investors</h1>
				<p className="text-center text-base text-(--text-secondary)">
					Filter a list of VCs by their investments in DeFi projects to connect with the right investors for your
					project.
				</p>
				<div className="relative flex flex-col gap-10 lg:flex-row">
					<div className="flex flex-1 flex-col gap-4">
						<h2 className="text-lg font-semibold">Filter Investors</h2>

						{/* <label className="flex flex-col gap-1 text-sm">
							<span className="">Categories:</span>
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
							<span className="">DeFi Categories:</span>
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
							<span className="">Round Types:</span>
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
							<span className="">Chains:</span>
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
						</label> */}
						<label className="flex flex-col gap-1 text-sm">
							<span className="">Minimum last investment time:</span>
							<input
								type="date"
								className="cursor-pointer rounded-md border border-(--form-control-border) bg-white p-1.5 text-base text-black dark:bg-black dark:text-white dark:[color-scheme:dark]"
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
							<span className="">Minimum number of investments:</span>
							<input
								type="number"
								value={filters.minimumInvestments}
								onChange={(e) => handleFilterChange('minimumInvestments', parseInt(e.target.value))}
								className="rounded-md border border-(--form-control-border) bg-white p-1.5 text-base text-black dark:bg-black dark:text-white"
							/>
						</label>

						<h2 className="text-lg font-semibold">Project Information</h2>

						<form onSubmit={handleSubmit} className="flex flex-col gap-4">
							<label className="flex flex-col gap-1 text-sm">
								<span className="">Project Name:</span>
								<input
									type="text"
									name="projectName"
									value={projectInfo.projectName}
									onChange={handleProjectInfoChange}
									required
									className="rounded-md border border-(--form-control-border) bg-white p-1.5 text-base text-black dark:bg-black dark:text-white"
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span className="">Link for further info:</span>
								<input
									name="link"
									value={projectInfo.link}
									onChange={handleProjectInfoChange}
									className="rounded-md border border-(--form-control-border) bg-white p-1.5 text-base text-black dark:bg-black dark:text-white"
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span className="">Short Pitch:</span>
								<textarea
									name="textPitch"
									value={projectInfo.textPitch}
									onChange={handleProjectInfoChange}
									required
									className="rounded-md border border-(--form-control-border) bg-white p-1.5 text-base text-black dark:bg-black dark:text-white"
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span className="">Founder Email:</span>
								<input
									type="email"
									name="founderEmail"
									value={projectInfo.founderEmail}
									onChange={handleProjectInfoChange}
									required
									className="rounded-md border border-(--form-control-border) bg-white p-1.5 text-base text-black dark:bg-black dark:text-white"
								/>
							</label>
							<button
								type="submit"
								disabled={isSubmitting}
								className="w-full rounded-md bg-(--primary) px-6 py-2 text-lg font-semibold text-white disabled:bg-(--bg-tertiary) disabled:text-(--text-tertiary)"
							>
								{isSubmitting ? 'Submitting...' : 'Submit'}
							</button>
						</form>
					</div>
					<div className="flex h-fit w-full max-w-xs flex-col gap-2 rounded-md bg-(--bg-secondary) p-4 shadow-sm lg:sticky lg:top-10">
						<h2>Results</h2>
						{isLoading ? <div className="animate-linebeat absolute top-0 left-0 h-1 w-[30%] bg-[#3498db]" /> : null}

						<p className="flex flex-wrap items-center justify-between gap-1 text-base">
							<span>Matched Investors:</span>{' '}
							<span className="font-semibold">{hasSelectedFilters ? matchedInvestors || '0' : '0'}</span>
						</p>
						<p className="flex flex-wrap items-center justify-between gap-1 text-base">
							<span>Total Cost:</span>
							{matchedInvestors && hasSelectedFilters ? (
								<span className="font-semibold text-(--success)">${totalCost}</span>
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
										className="w-full rounded-md bg-(--primary) px-6 py-2 text-lg font-semibold text-white disabled:bg-(--bg-tertiary) disabled:text-(--text-tertiary)"
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
