const _ = require('lodash')

let lastPricelog = {
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
	determine: function(price){
		let asking = price.ask

		if(asking === null){
			console.log('No asking price found for: '  + price.symbol)
			return
		}

		if(lastPriceLog[price.symbol] === null){
			lastPriceLog[price.symbol] = asking
			return
		}
		
		return evaluateAsking(asking)

	}
}

function evaluateChange(price, symbol){
	if (price > log[symbol]){
		return
	}else{
		let diff = log[symbol] - price
		let percentChange = _.round((diff / log[symbol]), 2) 
	}
}
