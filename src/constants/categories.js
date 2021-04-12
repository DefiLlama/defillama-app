import { BarChart, Feather, Shield, RefreshCcw, Archive, PieChart, Activity, Server } from 'react-feather'

const categories = [
    {
        name: 'Dexes',
        sidebar: true,
        icon: RefreshCcw
    },
    {
        name: 'Assets',
        sidebar: true,
        icon: Feather
    },
    {
        name: 'Lending',
        sidebar: true,
        icon: PieChart
    },
    {
        name: 'Yield',
        sidebar: true,
        icon: BarChart
    },
    {
        name: 'Insurance',
        sidebar: true,
        icon: Shield
    },
    {
        name: 'Options',
        sidebar: true,
        icon: Activity
    },
    {
        name: 'Indexes',
        sidebar: true,
        icon: Archive
    },
    {
        name: 'Staking',
        sidebar: true,
        icon: Server
    }
]

export default categories.reduce((acc, category) => {
    acc[category.name.toLowerCase()] = category;
    return acc;
}, {})
