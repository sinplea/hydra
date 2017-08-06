const _ = require('lodash')
const chalk = require('chalk')

let lastPriceLog = {
	'BCH/USD': null,
	'DASH/USD': null,
	'EOS/USD': null,
	'GNO/USD': null,
	'USDT/USD': null,
	'ETC/USD': null,
	'ETH/USD': null,
	'LTC/USD': null,
	'REP/USD': null,
	'BTC/USD': null,
	'XLM/USD': null,
	'XMR/USD': null,
	'XRP/USD': null,
	'ZEC/USD': null
}

module.exports = {
	determine: async function(price){
		let asking = price.ask

		if(asking === null){
			return 'No asking price found for: ' + chalk.magenta(price.symbol)
		}

		if(lastPriceLog[price.symbol] === null){
			lastPriceLog[price.symbol] = asking
			return 'No record for ' + chalk.magenta(price.symbol) + '. Assigning value to log: ' + chalk.green(lastPriceLog[price.symbol])
		}
		
		return evaluateChange(asking, price.symbol)

	}
}

function evaluateChange(price, symbol){
	if (price >= lastPriceLog[symbol]){
		return '[' + chalk.magenta(symbol) + '] Asking price has not lowered. Current asking: ' + chalk.yellow(price) + ' Last asking: ' + chalk.green(lastPriceLog[symbol])
	}else{
		let diff = lastPriceLog[symbol] - price
		let percentChange = _.round((diff / lastPriceLog[symbol]), 4) 
		return percentChange
	}
}
