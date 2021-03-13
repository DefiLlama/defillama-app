import { BarChart, Feather } from 'react-feather'

const categories = [
    {
        name: 'Dexes',
        sidebar: true,
        icon: BarChart
    },
    {
        name: 'Assets',
        sidebar: true,
        icon: Feather
    },
    {
        name: 'Lending',
        sidebar: true,
        icon: BarChart
    },
    {
        name: 'Yield',
        sidebar: true,
        icon: BarChart
    },
    {
        name: 'Minting',
        sidebar: false,
        icon: BarChart
    },
    {
        name: 'Services',
        sidebar: false,
        icon: BarChart
    },
    {
        name: 'Insurance',
        sidebar: true,
        icon: BarChart
    },
    {
        name: 'Options',
        sidebar: false,
        icon: BarChart
    },
    {
        name: 'Indexes',
        sidebar: true,
        icon: BarChart
    },
    {
        name: 'Staking',
        sidebar: false,
        icon: BarChart
    }
]

export default categories.reduce((acc, category) => {
    acc[category.name.toLowerCase()] = category;
    return acc;
}, {})