const axios = require('axios')
const moment = require('moment')
const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

const PERCENT_CHANGE = 0.005

let map

module.exports = {
	init: function(symbols){
		let empty = []

		for (let i = 0; i < symbols.length; i++){
			empty.push({
				lastClose: [],
				period5: [],
				period10: [],
				period12: [],
				period26: [],
				signal: [],
				macd: [],
				histogram: [],
				topPrices: [],
				paidAt: null,
				shortEMAPosition: null
			})
		}

		map = _.zipObject(symbols, empty)
	},
	determine: async function(market, symbol){
		const SHORTEST_PERIOD = 5
		const SHORTER_PERIOD = 10
		const SHORT_PERIOD = 12
		const LONG_PERIOD = 26
		const SIGNAL = 9

		let lastClose = map[symbol].lastClose
		let period5 = map[symbol].period5
		let period10 = map[symbol].period10
		let period12 = map[symbol].period12
		let period26 = map[symbol].period26
		let signal = map[symbol].signal
		let macd = map[symbol].macd
		let histogram = map[symbol].histogram
		let topPrices = map[symbol].topPrices
		let paidAt = map[symbol].paidAt

		try{
			let recentClose = await getRecentClose(market, symbol)

			if(lastClose.length < SHORTEST_PERIOD){
				console.log(chalk.blue('[' + symbol + '] ') + chalk.yellow('Getting more data for period 5... ') + chalk.magenta(lastClose.length))
				return
			}else{
				calculateEMA(period5, lastClose, symbol, SHORTEST_PERIOD)
			}

			if(lastClose.length < SHORTER_PERIOD){
				console.log(chalk.blue('[' + symbol + '] ') + chalk.yellow('Getting more data for period 10... ') + chalk.magenta(lastClose.length))
				return
			}else{
				calculateEMA(period10, lastClose, symbol, SHORTEST_PERIOD)
			}

			if(lastClose.length < SHORT_PERIOD){
				console.log(chalk.blue('[' + symbol + '] ') + chalk.yellow('Getting more data for short period... ') + chalk.magenta(lastClose.length))
				return
			}else{
				calculateEMA(period12, lastClose, symbol, SHORT_PERIOD)
			}

			if(lastClose.length < LONG_PERIOD){
				console.log(chalk.blue('[' + symbol + '] ') + chalk.yellow('Getting more data for long period... ') + chalk.magenta(lastClose.length))
				return
			}else{
				calculateEMA(period26, lastClose, symbol, LONG_PERIOD)
				// calculate macd
				subtractRights(period12, period26, macd)
			}

			if (lastClose.length < LONG_PERIOD + SIGNAL){
				console.log(chalk.blue('[' + symbol + '] ') + chalk.yellow('Getting more data for signal... ') + chalk.magenta(lastClose.length))
				return
			}else{
				calculateEMA(signal, macd, symbol, SIGNAL)
				// calculate histogram
				subtractRights(macd, signal, histogram)
			}

			// If our histogram is positive track closing prices seperately
			if(_.takeRight(histogram) > 0){
				topPrices.push(_.takeRight(lastClose))
			}else{
				topPrices = []
			}

			// Is short period above or below long period?
			let emaPosition = getShortEMAPosition(map[symbol].period5, map[symbol].period10)

			let sellEvaluation = evaluateSellPossibility(map[symbol], emaPosition)
			let buyEvaluation = evaluateBuyPossibility(map[symbol], emaPosition)

			let sell = sellEvaluation.bool
			let sellReason = sellEvaluation.reason

			let buy = buyEvaluation.bool
			let buyReason = buyEvaluation.reason

			// Keep track of the price we paid.
			if (buy){
				map[symbol].paidAt = recentClose
			}

			return {
				symbol: symbol,
				sell: sell,
				buy: buy,
				price: recentClose,
				buyReason: buyReason,
				sellReason: sellReason
			}
		}catch(err){
			console.log('Error occured. Retrying...')
			console.log(err)
			if (err) {
				setTimeout(async () => {
					await this.determine(market, symbol)					
				})
			}
		}

	}
}

function evaluateBuyPossibility(map, emaPosition){
	let emaPositionSwitched = false;

	if (map.emaPosition === 'below' && emaPosition === 'above'){
		emaPositionSwitched = true
	}

	map.emaPosition = emaPosition

	if (emaPositionSwitched){
		return {
			bool: true,
			reason: 'Short EMA crossed above long EMA indicating a good time to buy.'
		}
	}

	return {
		bool: false,
		reason: ''
	}
}

function getShortEMAPosition(period5, period10){
	let lastPeriod5 = _.takeRight(period5)
	let lastPeriod10 = _.takeRight(period10)

	if (lastPeriod5[0] < lastPeriod10[0]){
		return 'below'
	}

	return 'above'
}

function evaluateSellPossibility(map, emaPosition){
	let emaPositionSwitched = false


	if (metPercentageExpectation(map)){
		return {
			bool: true,
			reason: 'Price increased by: ' + PERCENT_CHANGE + '%'
		}
	}

	if (map.emaPosition === 'above' && emaPosition === 'below'){
		emaPositionSwitched = true
	}

	if (emaPositionSwitched){
		return {
			bool: true,
			reason: 'Short EMA crossed below a long EMA indicating a time to sell.'
		}
	}

	// if trending down
	if (_.takeRight(map.histogram) < 0){
		return {
			bool: true,
			reason: 'Histogram indicated a down trend.'
		}
	}

	// if the future isn't looking good.
	if (checkForSignificantLow(map)){
		return {
			bool: true,
			reason: 'Saw a significant drop in currency\'s best price.'
		}
	}

	return {
		bool: false,
		reason: ''
	}
}

function metPercentageExpectation(map){
	if (map.paidAt === -1){
		return false;
	}

	let currentArr = _.takeRight(map.lastClose)
	let current = currentArr[0]

	let difference = current - map.paidAt
	let percentage = map.paidAt / difference

	if (percentage >= PERCENT_CHANGE){
		return true
	}

	return false
}

function checkForSignificantLow(map){
	if (map.topPrices.length === 0){
		return false
	}

	let current = _.takeRight(map.topPrices)
	let max = _.max(map.topPrices)
	let difference = max - current

	if (difference < 0){
		return false
	}

	let maxPercentChange = 0.03
	let percentage = (difference / max) * 100

	if (percentage > maxPercentChange){
		map.topPrices = []
		return true
	}

	return false
}

function calculateEMA(array, closings, symbol, period){
	if(array.length !== 0){
		let ema = getExponentialMovingAverage(closings, symbol, period, array)
		array.push(ema)
	}else{
		let sma = getSimpleMovingAverage(closings, symbol, period)
		array.push(sma)
	}
}

function subtractRights(input1, input2, out){
	out.push(_.takeRight(input1) - _.takeRight(input2))
}

// Pretty sure the ticker from ccxt is shit. Going to get 
// prices from somewhere else.
async function getRecentClose(market, symbol){
	let clean = symbol.replace('/', '')
	let lowercase = clean.toLowerCase();

	try{
		let url = 'https://api.cryptowat.ch/markets/kraken/' + lowercase + '/price'
		let priceObject = await axios.get(url)
		map[symbol].lastClose.push(priceObject.data.result.price)
		return priceObject.data.result.price
	}catch(err){
		setTimeout(() => {
			getRecentClose(market, symbol)
		}, 2000)
	}

}

function getExponentialMovingAverage(base, symbol, period, values){
	let ratio = 2 / (period + 1)
	let close = _.takeRight(base)

	let ema = (close * ratio) + (_.takeRight(values) * (1 - ratio))

	if(ema !== null){
		return ema
	}else{
		return new Error('ema is not defined')
	}
}

function getSimpleMovingAverage(base, symbol, period){
	let dataSet = _.take(base, period)

	let sum = sumArray(dataSet)
	let sma = sum / period

	if(sma !== null){
		return sma
	}else{
		return new Error('sma is not defined')
	}
}

function sumArray(array){
	let sum = 0

	for (let i = 0; i < array.length; i++){
		sum += array[i]
	}

	return sum
}
