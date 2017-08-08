const axios = require('axios')
const moment = require('moment')
const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

let lastClose

module.exports = {
	init: function(symbols){
		let emptyArray = []

		for (let i = 0; i < symbols.length; i++){
			emptyArray.push([])
		}

		lastClose = _.zipObject(symbols, emptyArray)
	},
	determine: async function(market, symbol){
		try{
			let movingAverages = await getSimpleMovingAverages(market, symbol)

			if(typeof movingAverages !== 'error' && movingAverages !== undefined){
				let trend = determineTrend(movingAverages) // uptrend true, downtrend false
				let sell = false

				if (trend){
					sell = movingAverages.smallSMA < movingAverages.largeSMA
				}

				return {
					sell,
					trend
				}
			}
			return
		}catch(err){
			console.log(err)
			return err
		}

	}
}

async function getSimpleMovingAverages(market, symbol){
	let smallPeriod = 6
	let largePeriod = 12

	let largeSum = 0
	let smallSum = 0

	let smallSMA
	let largeSMA

	try{
		let priceObject = await market.fetchTicker(symbol)

		lastClose[symbol].push(priceObject.ask)

		if (lastClose[symbol].length < largePeriod){
			console.log(chalk.yellow('[' + symbol + ']: ') + 'fetching data...')
			return
		}

		let largeDataSet = _.takeRight(lastClose[symbol], largePeriod)
		let smallDataSet = _.takeRight(lastClose[symbol], smallPeriod)

		let smallSum = sumArray(smallDataSet)
		let largeSum = sumArray(largeDataSet)

		smallSMA = smallSum / smallPeriod
		largeSMA = largeSum / largePeriod

		if(smallSMA !== null && largeSMA !== null){
			return {
				smallSMA,
				largeSMA,
				ask: priceObject.ask
			}
		}else{
				new Error('smallSMA or largeSMA is not defined')
		}
	}catch(err){
		console.log(err)
		return err
	}
}

function sumArray(array){
	let sum = 0

	for (let i = 0; i < array.length; i++){
		sum += array[i]
	}

	return sum
}

function determineTrend(movingAverages){
	let large = movingAverages.largeSMA
	let ask = movingAverages.ask

	return ask > large

}
