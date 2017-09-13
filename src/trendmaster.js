const axios = require('axios')
const moment = require('moment')
const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
require('console.table')

let map

module.exports = {
	init: function(symbols){
		let empty = []

		for (let i = 0; i < symbols.length; i++){
			empty.push({
				lastClose: [],
				period12: [],
				period26: [],
				signal: [],
				macd: [],
				histogram: [],
				topPrices: []
			})
		}

		map = _.zipObject(symbols, empty)
	},
	determine: async function(market, symbol){
		const SHORT_PERIOD = 12
		const LONG_PERIOD = 26
		const SIGNAL = 9

		let lastClose = map[symbol].lastClose
		let period12 = map[symbol].period12
		let period26 = map[symbol].period26
		let signal = map[symbol].signal
		let macd = map[symbol].macd
		let histogram = map[symbol].histogram
		let topPrices = map[symbol].topPrices

		try{
			let recentClose = await getRecentClose(market, symbol)

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

			if(_.takeRight(histogram) > 0){
				topPrices.push(_.takeRight(lastClose))
			}else{
				topPrices = []
			}

			let sellEvaluation = evaluateSellPossibility(map[symbol])
			let buyEvaluation = evaluateBuyPossibility(map[symbol])

			let sell = sellEvaluation.bool
			let sellReason = sellEvaluation.reason

			let buy = buyEvaluation.bool
			let buyReason = buyEvaluation.reason

			let trend = _.takeRight(histogram) > 0 ? true : false

			return {
				symbol: symbol,
				sell: sell,
				buy: buy,
				trend: trend,
				price: recentClose,
				buyReason: buyReason,
				sellReason: sellReason
			}
		}catch(err){
			console.log('Error occured. Retrying...')
			if (err) {
				await this.determine(market, symbol)
			}

		}

	}
}

function evaluateBuyPossibility(map){
	if (checkIfHistoChangedSigns(map)){
		return {
			bool: true,
			reason: 'Histogram went from negative to positve.'
		}
	}

	if (shortEMACrossedAboveLongEMA(map)){
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

function evaluateSellPossibility(map){

	if (shortEMACrossedBelowLongEMA(map)){
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

// means buy
function shortEMACrossedAboveLongEMA(map){
	let shorts = _.takeRight(map.period12, 2)
	let longs = _.takeRight(map.period26, 2)

	let prevShort = shorts[0]
	let currentShort = shorts[1]
	let prevLong = longs[0]
	let currentLong = longs[1]

	if (prevShort < prevLong){
		if (currentShort > currentLong){
			return true
		}

		return false
	}

	return false
}

// means sell
function shortEMACrossedBelowLongEMA(map){
	let shorts = _.takeRight(map.period12, 2)
	let longs = _.takeRight(map.period26, 2)

	let prevShort = shorts[0]
	let currentShort = shorts[1]
	let prevLong = longs[0]
	let currentLong = longs[1]

	if (prevShort > prevLong){
		if (currentShort < currentLong){
			return true
		}

		return false
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

// Checks over a longer history to avoid false occurences.
function checkIfHistoChangedSigns(map){
	let lastThree = _.takeRight(map.histogram, 3)
	let last = lastThree[0]
	let mid = lastThree[1]
	let current = lastThree[2]

	if (prev < 0 && current > 0 && mid > 0){
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

async function getRecentClose(market, symbol){
	try{
		let priceObject = await market.fetchTicker(symbol)
		map[symbol].lastClose.push(priceObject.ask)
		return priceObject.ask
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
