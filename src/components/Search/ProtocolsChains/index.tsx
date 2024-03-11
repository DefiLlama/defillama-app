import { useRouter } from 'next/router'
import { DesktopSearch } from '../Base'
import { IBaseSearchProps, ICommonSearchProps, SETS } from '../types'
import { DesktopProtocolFilters, TabletProtocolsFilters } from '~/components/Filters/protocols'
import { useGetDefiSearchList } from './hooks'
import { DesktopTvlAndFeesFilters } from '~/components/Filters/protocols/Desktop'
import { TabletTvlAndFeesFilters } from '~/components/Filters/protocols/Tablet'

interface IProtocolsChainsSearch extends ICommonSearchProps {
	includedSets?: SETS[]
	customPath?: IBaseSearchProps['customPath']
	options?: { name: string; key: string }[]
	hideFilters?: boolean
}

export default function ProtocolsChainsSearch(props: IProtocolsChainsSearch) {
	const { includedSets = Object.values(SETS), customPath, options, hideFilters = false } = props

	const { data, loading } = useGetDefiSearchList({ includedSets, customPath })

	return (
		<DesktopSearch
			{...props}
			data={data}
			loading={loading}
			filters={hideFilters ? null : <TvlOptions options={options} />}
		/>
	)
}

const TvlOptions = ({ options }: { options?: { name: string; key: string }[] }) => {
	const router = useRouter()

	if (router.pathname?.includes('/protocol/')) {
		if (!options || options.length === 0) return null

		return (
			<>
				<DesktopTvlAndFeesFilters options={options} />
				<TabletTvlAndFeesFilters options={options} />
			</>
		)
	}

	return (
		<>
			<DesktopProtocolFilters options={options} />
			<TabletProtocolsFilters options={options} />
		</>
	)
}
