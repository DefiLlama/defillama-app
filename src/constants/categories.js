import { BarChart, Feather, Shield, RefreshCcw, Archive, PieChart, Activity, Server, Link } from 'react-feather'

const categories = [
    {
        name: 'Dexes',
        icon: RefreshCcw
    },
    {
        name: 'Assets',
        icon: Feather
    },
    {
        name: 'Lending',
        icon: PieChart
    },
    {
        name: 'Yield',
        icon: BarChart
    },
    {
        name: 'Insurance',
        icon: Shield
    },
    {
        name: 'Options',
        icon: Activity
    },
    {
        name: 'Indexes',
        icon: Archive
    },
    {
        name: 'Staking',
        icon: Server
    },
]

export default categories
