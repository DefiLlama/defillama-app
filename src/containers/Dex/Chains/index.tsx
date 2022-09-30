import * as React from 'react'
import { VolumeByChainsTable } from '~/components/Table'

export interface IVolumesByChain {}

export default function VolumesByChainContainer({ data }) {
	console.log({ data })
	return (
		<>
			<VolumeByChainsTable data={data} />
		</>
	)
}
