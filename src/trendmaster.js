const axios = require('axios')
const moment = require('moment')
const _ = require('lodash')
const fs = require('fs')
const path = require('path')

let lastClose = []

module.exports = {
	determine: async function(market, symbol){
		try{
			let movingAverages = await getSimpleMovingAverages(market, symbol)

			if(typeof movingAverages !== 'error' && movingAverages !== undefined){
				let trend = determineTrend(movingAverages) // uptrend true, downtrend false

				let comparison = compareAverages(movingAverages)
				// if comparison = true, then small > large
				// if false. small < large

				console.log({trend})

				let buy
				let sell

				if (comparison){
					buy = checkForBuyPossibility(movingAverages, symbol)
				}else{
					sell = checkForSellPossibility(movingAverages, symbol)
				}

				console.log({ buy, sell })
			}
		}catch(err){
			console.log(err)
			return err
		}

	}
}

async function getSimpleMovingAverages(market, symbol){
	let smallPeriod = 5
	let largePeriod = 10

	let largeSum = 0
	let smallSum = 0

	let smallSMA
	let largeSMA

	try{
		let priceObject = await market.fetchTicker(symbol)

		lastClose.push(priceObject.ask)

		if (lastClose.length < largePeriod){
			console.log('Waiting for more data')
			return
		}

		let largeDataSet = _.takeRight(lastClose, largePeriod)
		let smallDataSet = _.takeRight(lastClose, smallPeriod)

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

			console.log({symbol, ask:priceObject.ask})
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

	console.log({large, ask})

	return ask > large

}

function compareAverages(movingAverages){
	return movingAverages.smallSMA > movingAverages.largeSMA
}

function checkForBuyPossibility(movingAverages, symbol){
	let symbolName = symbol.split('/')[0]
	let filePath = path.resolve(__dirname, '..', symbolName + '.txt')

	if(fs.existsSync(filePath)){
		let buy
		// read file, compare, overwrite data
		let lastAveragesString = fs.readFileSync(filePath)
		let lastAverages = JSON.parse(lastAveragesString)

		buy = lastAverages.smallSMA < lastAverages.largeSMA
		return buy

	}else{
		fs.writeFileSync(filePath, JSON/stringify(movingAverages))
		console.log('Wrote to ' + filePath)
		return false
	}
}

function checkForSellPossibility(movingAverages, symbol){
	let symbolName = symbol.split('/')[0]
	let filePath = path.resolve(__dirname, '..', symbolName + '.txt')

	if(fs.existsSync(filePath)){
		let sell
		// read file, compare, overwrite data
		let lastAveragesString = fs.readFileSync(filePath)
		let lastAverages = JSON.parse(lastAveragesString)

		sell = lastAverages.smallSMA > lastAverages.largeSMA
		return sell

	}else{
		fs.writeFileSync(filePath, JSON.stringify(movingAverages))
		console.log('Wrote to ' + filePath)
		return false
	}
}
