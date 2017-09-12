const _ = require('lodash')
const ccxt = require('ccxt')
const twilio = require('twilio')
const chalk = require('chalk')

const accountSid = 'AC0082db851c269381c28c189ffb5cb2af'
const authToken = '6e502eaa008df7d3e081b66c4cadc286'
const client = new twilio(accountSid, authToken)

const BET_PERCENTAGE = 0.30 // percentage to take from total usd
const MIN_BALANCE = 10

module.exports = {
	trade: async function(sellOptions, market){

		try{
			let balance = await market.fetchBalance()
			// currencies I currently have money invested in
			let currencies = findInvestments(balance)

			for (let i = 0; i < currencies.length; i++){
				await tryToSellCurrency(sellOptions, balance, market, currencies[i], i)
			}

			setTimeout(async () => {
				await tryToBuyCurrency(sellOptions, balance, market)
			}, 2000)

		}catch(err){
			console.log(err)

			if (typeof err === 'NetworkError'){
				trade(sellOptions, market)
			}
		}

	}
}

async function tryToBuyCurrency(sellOptions, balance, market){
	let buyCurrencyStatus = _.find(sellOptions, function(o){ return o.buy === true && o.sell === false})
	// if we want to buy a currency
	if (buyCurrencyStatus !== undefined){
		// check if we have USD
		let money = balance.USD.free * BET_PERCENTAGE

		if (money > MIN_BALANCE){
			let lastBestPrice = buyCurrencyStatus.price
			let amount = _.round(money / lastBestPrice, 8)

			console.log(chalk.magenta("Trying to buy: " + amount + ' of ' + buyCurrencyStatus.symbol + ' with ' + money + ' USD'))
			console.log(chalk.yellow('Reason: ' + buyCurrencyStatus.buyReason))

			await fillBuyOrder(market, buyCurrencyStatus.symbol, amount)
		}else{
			console.log(chalk.red('USD bet is less than minimum allowed. Texting user.'))
			alertUser()
		}
	}
}

async function tryToSellCurrency(sellOptions, balance, market, current, delayModifier){
	setTimeout(async () => {
		// get sell/buy status from sellOptions
		let sellCurrencyStatuses = _.find(sellOptions, function(o){ return o.symbol === current})

		if (sellCurrencyStatuses == undefined) {
			return
		}

		// if sell
		if (sellCurrencyStatuses.sell === true){
			let symbolLookUpString = current.split('/')[0]
			let totalInvestment = balance[symbolLookUpString].free

			if (totalInvestment < 0.0001) {
				return
			}

			console.log(chalk.magenta("Trying to sell: " + totalInvestment + " of " + currencies[i]))
			console.log(chalk.yellow('Reason: ' + sellCurrencyStatuses.sellReason))
			await fillSellOrder(market, current, _.round(totalInvestment, 8))
		}
	}, delayModifier * 1000)
}

async function fillSellOrder(market, symbol, amount){
	try{
		let ticket = await market.createMarketSellOrder(symbol, amount)
		console.log(chalk.green({ticket}))
	}catch (err){
		console.log(chalk.red(err))
	}
}

async function fillBuyOrder(market, symbol, amount){
	try{
		let ticket = await market.createMarketBuyOrder(symbol, amount)
		console.log(chalk.green({ticket}))
	}catch (err){
		console.log(chalk.red(err))
	}
}

function alertUser(){
	client.messages.create({
		body: 'Hydra: USD balance has fallen below $' + MIN_BALANCE + '. Deposit more if you would like to continue trading. https://www.kraken.com/u/funding/deposit',
		to: '+16188068292',
		from: '+17082953385'
	})
}

function findInvestments(balance){
	let cleanStrings = []
	let investments = _.keysIn(balance.info)

	for (let i = 0; i < investments.length; i++){
		if (investments[i] === 'ZUSD') continue

		let symbol

		if (investments[i].charAt(0) === 'X'){
			symbol = investments[i].substr(1)
		}else{
			symbol = investments[i]
		}


		if (symbol === 'XBT'){
			symbol = 'BTC'
		}

		cleanStrings.push(symbol + '/USD')
	}

	return cleanStrings
}
