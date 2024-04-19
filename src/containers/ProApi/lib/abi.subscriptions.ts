export const SUBSCRIPTIONS_ABI = [
	{
		inputs: [
			{ internalType: 'uint256', name: '_periodDuration', type: 'uint256' },
			{ internalType: 'address', name: '_vault', type: 'address' },
			{ internalType: 'address', name: '_feeCollector', type: 'address' },
			{ internalType: 'uint256', name: '_currentPeriod', type: 'uint256' },
			{ internalType: 'address', name: 'rewardRecipient_', type: 'address' },
			{ internalType: 'address', name: 'stakingRewards_', type: 'address' },
			{ internalType: 'uint256', name: 'minBalanceToTriggerDeposit_', type: 'uint256' }
		],
		stateMutability: 'nonpayable',
		type: 'constructor'
	},
	{
		anonymous: false,
		inputs: [
			{ indexed: false, internalType: 'address', name: 'owner', type: 'address' },
			{ indexed: false, internalType: 'uint256', name: 'initialPeriod', type: 'uint256' },
			{ indexed: false, internalType: 'uint256', name: 'expirationDate', type: 'uint256' },
			{ indexed: false, internalType: 'uint256', name: 'amountPerCycle', type: 'uint256' },
			{ indexed: false, internalType: 'address', name: 'receiver', type: 'address' },
			{ indexed: false, internalType: 'uint256', name: 'accumulator', type: 'uint256' },
			{ indexed: false, internalType: 'uint256', name: 'initialShares', type: 'uint256' },
			{ indexed: false, internalType: 'bytes32', name: 'subId', type: 'bytes32' },
			{ indexed: false, internalType: 'uint256', name: 'instantPayment', type: 'uint256' }
		],
		name: 'NewDelayedSubscription',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{ indexed: false, internalType: 'address', name: 'owner', type: 'address' },
			{ indexed: false, internalType: 'uint256', name: 'initialPeriod', type: 'uint256' },
			{ indexed: false, internalType: 'uint256', name: 'expirationDate', type: 'uint256' },
			{ indexed: false, internalType: 'uint256', name: 'amountPerCycle', type: 'uint256' },
			{ indexed: false, internalType: 'address', name: 'receiver', type: 'address' },
			{ indexed: false, internalType: 'uint256', name: 'accumulator', type: 'uint256' },
			{ indexed: false, internalType: 'uint256', name: 'initialShares', type: 'uint256' },
			{ indexed: false, internalType: 'bytes32', name: 'subId', type: 'bytes32' }
		],
		name: 'NewSubscription',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{ indexed: true, internalType: 'address', name: 'user', type: 'address' },
			{ indexed: true, internalType: 'address', name: 'newOwner', type: 'address' }
		],
		name: 'OwnershipTransferred',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [{ indexed: false, internalType: 'bytes32', name: 'subId', type: 'bytes32' }],
		name: 'Unsubscribe',
		type: 'event'
	},
	{
		inputs: [],
		name: 'DIVISOR',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'asset',
		outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'bytes[]', name: 'calls', type: 'bytes[]' },
			{ internalType: 'bool', name: 'revertOnFail', type: 'bool' }
		],
		name: 'batch',
		outputs: [],
		stateMutability: 'payable',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
		name: 'claim',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{ inputs: [], name: 'claimRewards', outputs: [], stateMutability: 'nonpayable', type: 'function' },
	{
		inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
		name: 'convertToAssets',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'uint256', name: 'assets', type: 'uint256' }],
		name: 'convertToShares',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'currentPeriod',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'feeCollector',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: 'owner', type: 'address' },
			{ internalType: 'uint256', name: 'initialPeriod', type: 'uint256' },
			{ internalType: 'uint256', name: 'expirationDate', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountPerCycle', type: 'uint256' },
			{ internalType: 'address', name: 'receiver', type: 'address' },
			{ internalType: 'uint256', name: 'accumulator', type: 'uint256' },
			{ internalType: 'uint256', name: 'initialShares', type: 'uint256' }
		],
		name: 'getSubId',
		outputs: [{ internalType: 'bytes32', name: 'id', type: 'bytes32' }],
		stateMutability: 'pure',
		type: 'function'
	},
	{
		inputs: [],
		name: 'minBalanceToTriggerDeposit',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'owner',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: 'receiver', type: 'address' },
			{ internalType: 'uint256', name: 'limit', type: 'uint256' }
		],
		name: 'partialUpdateReceiver',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'periodDuration',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'contract IERC20Permit', name: 'token', type: 'address' },
			{ internalType: 'address', name: 'from', type: 'address' },
			{ internalType: 'address', name: 'to', type: 'address' },
			{ internalType: 'uint256', name: 'amount', type: 'uint256' },
			{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
			{ internalType: 'uint8', name: 'v', type: 'uint8' },
			{ internalType: 'bytes32', name: 'r', type: 'bytes32' },
			{ internalType: 'bytes32', name: 's', type: 'bytes32' }
		],
		name: 'permitToken',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: '', type: 'address' },
			{ internalType: 'uint256', name: '', type: 'uint256' }
		],
		name: 'receiverAmountToExpire',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'address', name: '', type: 'address' }],
		name: 'receiverBalances',
		outputs: [
			{ internalType: 'uint256', name: 'balance', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountPerPeriod', type: 'uint256' },
			{ internalType: 'uint256', name: 'lastUpdate', type: 'uint256' }
		],
		stateMutability: 'view',
		type: 'function'
	},
	{ inputs: [], name: 'refreshApproval', outputs: [], stateMutability: 'nonpayable', type: 'function' },
	{
		inputs: [],
		name: 'rewardRecipient',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'rewardsToken',
		outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
		name: 'sendRewards',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'uint256', name: '_minBalanceToTriggerDeposit', type: 'uint256' }],
		name: 'setMinBalanceToTriggerDeposit',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'address', name: '_rewardRecipient', type: 'address' }],
		name: 'setRewardRecipient',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'sharesAccumulator',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		name: 'sharesPerPeriod',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'stakingRewards',
		outputs: [{ internalType: 'contract StakingRewards', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
		name: 'subs',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: 'receiver', type: 'address' },
			{ internalType: 'uint256', name: 'amountPerCycle', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountForFuture', type: 'uint256' }
		],
		name: 'subscribe',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: 'receiver', type: 'address' },
			{ internalType: 'uint256', name: 'amountPerCycle', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountForFuture', type: 'uint256' },
			{ internalType: 'uint256', name: 'instantPayment', type: 'uint256' }
		],
		name: 'subscribeForNextPeriod',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'totalAssets',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'totalSupply',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
		name: 'transferOwnership',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'uint256', name: 'maxToPull', type: 'uint256' }],
		name: 'triggerDeposit',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'initialPeriod', type: 'uint256' },
			{ internalType: 'uint256', name: 'expirationDate', type: 'uint256' },
			{ internalType: 'uint256', name: 'amountPerCycle', type: 'uint256' },
			{ internalType: 'address', name: 'receiver', type: 'address' },
			{ internalType: 'uint256', name: 'accumulator', type: 'uint256' },
			{ internalType: 'uint256', name: 'initialShares', type: 'uint256' }
		],
		name: 'unsubscribe',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'vault',
		outputs: [{ internalType: 'contract Yearn', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	}
]
