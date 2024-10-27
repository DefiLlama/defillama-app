import { trim } from 'lodash'
import React, { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import styled, { css, keyframes } from 'styled-components'
import { maxAgeForNext } from '~/api'
import ReactSelect from '~/components/MultiSelect/ReactSelect'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const get = (url) => fetch(url).then((r) => r.json())

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

const DateInputWrapper = styled.div`
	position: relative;
	width: 100%;
`

const HiddenDateInput = styled.input`
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	opacity: 0;
	cursor: pointer;
`

const PageWrapper = styled.div`
	max-width: 1200px;
	margin: 0 auto;
	padding: 10px 20px;
	color: ${({ theme }) => theme.text1};
	background-color: ${({ theme }) => theme.bg1};
	border-radius: 8px;
`

const ContentWrapper = styled.div`
	display: flex;
	gap: 40px;

	@media (max-width: 1024px) {
		flex-direction: column;
	}
`

const MainContent = styled.div`
	flex: 1;
`

const ResultContent = styled.div`
	width: 300px;
	position: sticky;
	top: 40px;
	align-self: flex-start;

	@media (max-width: 1024px) {
		width: 100%;
		position: relative;
		top: 0;
	}
`

const Description = styled.p`
	font-size: 16px;
	line-height: 1.6;
	text-align: center;
	color: ${({ theme }) => theme.text2};
	margin-bottom: 20px;
`

const SectionTitle = styled.h2`
	font-size: 24px;
	color: ${({ theme }) => theme.text1};
	margin-bottom: 20px;
	border-bottom: 2px solid ${({ theme }) => theme.primary1};
	padding-bottom: 10px;
`

const FilterContainer = styled.div`
	margin-bottom: 24px;
`

const Label = styled.label`
	display: block;
	margin-bottom: 8px;
	color: ${({ theme }) => theme.text2};
	font-weight: 600;
`

const inputStyles = css`
	width: 100%;
	padding: 12px;
	border: 1px solid ${({ theme }) => theme.bg3};
	border-radius: 8px;
	background-color: ${({ theme }) => theme.bg2};
	color: ${({ theme }) => theme.text1};
	font-size: 16px;
	transition: all 0.3s ease;

	&:focus {
		outline: none;
		border-color: ${({ theme }) => theme.primary1};
		box-shadow: 0 0 0 2px ${({ theme }) => theme.primary1}33;
	}
`

const Input = styled.input`
	${inputStyles}
`

const TextArea = styled.textarea`
	${inputStyles}
	min-height: 120px;
	resize: vertical;
`

const Button = styled.button`
	background-color: ${({ theme, disabled }) => (disabled ? theme.bg3 : theme.primary1)};
	color: ${({ theme, disabled }) => (disabled ? theme.text3 : theme.white)};
	padding: 12px 24px;
	border: none;
	border-radius: 8px;
	width: 100%;
	cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
	font-size: 18px;
	font-weight: 600;
	transition: all 0.3s ease;
	margin-top: 12px;
	display: block;

	&:hover {
		background-color: ${({ theme, disabled }) => (disabled ? theme.bg3 : theme.primary2)};
	}
`

const ResultsContainer = styled.div`
	padding: 20px;
	background-color: ${({ theme }) => theme.bg2};
	border-radius: 8px;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	min-height: 130px;
`

const WarningText = styled.p`
	color: ${({ theme }) => theme.red1};
	font-weight: 600;
`

const StyledReactSelect = styled(ReactSelect)`
	.react-select__control {
		${inputStyles}
	}

	.react-select__menu {
		background-color: ${({ theme }) => theme.bg2};
		border: 1px solid ${({ theme }) => theme.bg3};
	}

	.react-select__option {
		background-color: ${({ theme }) => theme.bg2};
		color: ${({ theme }) => theme.text1};

		&:hover {
			background-color: ${({ theme }) => theme.bg3};
		}
	}
`

const ResultText = styled.p`
	font-size: 16px;
	margin-bottom: 10px;
	display: flex;
	justify-content: space-between;
	align-items: center;
`

const ResultValue = styled.span`
	font-weight: 600;
`

const USDAmount = styled.span`
	color: ${({ theme }) => theme.green1};
	font-weight: 700;
`

const DateInputDisplay = styled.input`
	${inputStyles}
	cursor: pointer;
`

const moveAnimation = keyframes`
  0% {
    left: 0;
		border-top-left-radius: 8px;
	  border-top-right-radius:0;
  }

	50% {
		border-radius: 8px;
	}
  
	100% {
    left: calc(100% - 30%);
		border-top-left-radius: 0;
	  border-top-right-radius:8px;
  }
`

const LoadingLine = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	width: 30%;
	height: 4px;
	background-color: #3498db;
	animation: ${moveAnimation} 1s ease-in-out infinite alternate;
`

const DatePicker = ({ value, onChange, max }) => {
	const hiddenInputRef = useRef(null)

	const handleClick = () => {
		hiddenInputRef.current.showPicker()
	}

	return (
		<DateInputWrapper onClick={handleClick}>
			<DateInputDisplay type="text" value={value} readOnly placeholder="Select a date" />
			<HiddenDateInput ref={hiddenInputRef} type="date" value={value} onChange={onChange} max={max} />
		</DateInputWrapper>
	)
}

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
			<PageWrapper>
				<h1 className="text-2xl font-medium text-center my-3">Connect with Investors</h1>
				<Description>
					Filter a list of VCs by their investments in DeFi projects to connect with the right investors for your
					project.
				</Description>
				<ContentWrapper>
					<MainContent>
						<SectionTitle>Filter Investors</SectionTitle>

						<FilterContainer>
							<Label>Categories:</Label>
							<StyledReactSelect
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
						</FilterContainer>
						<FilterContainer>
							<Label>DeFi Categories:</Label>
							<StyledReactSelect
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
						</FilterContainer>
						<FilterContainer>
							<Label>Round Types:</Label>
							<StyledReactSelect
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
						</FilterContainer>
						<FilterContainer>
							<Label>Chains:</Label>
							<StyledReactSelect
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
						</FilterContainer>
						<FilterContainer>
							<Label>Minimum last investment time:</Label>
							<DatePicker
								value={unixToDateString(filters.minLastRoundTime)}
								onChange={handleDateChange}
								max={new Date().toISOString().split('T')[0]}
							/>
						</FilterContainer>
						<FilterContainer>
							<Label>Minimum number of investments:</Label>
							<Input
								type="number"
								value={filters.minimumInvestments}
								onChange={(e) => handleFilterChange('minimumInvestments', parseInt(e.target.value))}
							/>
						</FilterContainer>

						<SectionTitle>Project Information</SectionTitle>
						<form onSubmit={handleSubmit}>
							<FilterContainer>
								<Label>Project Name:</Label>
								<Input
									type="text"
									name="projectName"
									value={projectInfo.projectName}
									onChange={handleProjectInfoChange}
									required
								/>
							</FilterContainer>
							<FilterContainer>
								<Label>Link for further info:</Label>
								<Input name="link" value={projectInfo.link} onChange={handleProjectInfoChange} />
							</FilterContainer>
							<FilterContainer>
								<Label>Short Pitch:</Label>
								<TextArea name="textPitch" value={projectInfo.textPitch} onChange={handleProjectInfoChange} required />
							</FilterContainer>
							<FilterContainer>
								<Label>Founder Email:</Label>
								<Input
									type="email"
									name="founderEmail"
									value={projectInfo.founderEmail}
									onChange={handleProjectInfoChange}
									required
								/>
							</FilterContainer>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? 'Submitting...' : 'Submit'}
							</Button>
						</form>
					</MainContent>
					<ResultContent>
						{
							<ResultsContainer>
								<h2 style={{ marginBottom: '8px' }}>Results</h2>
								{isLoading ? <LoadingLine /> : null}

								<>
									<ResultText>
										Matched Investors: <ResultValue>{hasSelectedFilters ? matchedInvestors || '0' : '0'}</ResultValue>
									</ResultText>
									<ResultText>
										Total Cost:{' '}
										{matchedInvestors && hasSelectedFilters ? (
											<USDAmount>${totalCost}</USDAmount>
										) : (
											<ResultValue> 0 </ResultValue>
										)}
									</ResultText>
									{matchedInvestors > 100 && hasSelectedFilters ? (
										<WarningText>To reduce costs, please filter further.</WarningText>
									) : null}
									{paymentLink && (
										<>
											<Button onClick={() => window.open(paymentLink, '_blank')} disabled={isSubmitting}>
												{isSubmitting ? 'Processing...' : 'Go to Payment'}
											</Button>
										</>
									)}
								</>
							</ResultsContainer>
						}
					</ResultContent>
				</ContentWrapper>
			</PageWrapper>
		</Layout>
	)
}

const QueryProviderWrapper = (props) => {
	return <VCFilterPage {...props} />
}

export default QueryProviderWrapper
