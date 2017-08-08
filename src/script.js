const ccxt = require('ccxt')
const _ = require('lodash')
const chalk = require('chalk')

const teller = require('./teller.js')
const trendmaster = require('./trendmaster.js')

// here we will setup the connections to our markets.
// we will try to trade between all US markets
//
// 1Broker
// Bitfinex
// Bittrex
// GDAX
// Gemini
// itBit
// Kraken
// lakeBTC
// livecoin
// poloniex
// okcoin(USD)

const COOLDOWN = 60000 // milliseconds

const BROKER_API_KEY = 'A49d8e1a1e95b15777d14f3119505ae3'
const BITFINEX_API_KEY = '84bF0YXu3rZhzS6ObVdNd2oIpX5Cabvsbp636gJARQ2'
const BITFINEX_SECRET = 'QXhGzSHmnqwWgcuL4pr1ttKvvFZNcdVXZdG72a2c156'

const KRAKEN_API_KEY = '1AlzaDQDXtDeiRlsm5Sd5JbSGtoRNnD8ajXlAzU1Qg3LGiCO/bpfgVvy'
const KRAKEN_SECRET = '+9/+cGM+8rNvmhbrpc9Ztq0cM3Dbrb6CZR8KNH8mKOym+fCeHK7rW6beftcltuBDi437lyLhfeGGtp7nrXeLYw=='

async function main(){
	let kraken = ccxt.kraken({
		apiKey: KRAKEN_API_KEY,
		secret: KRAKEN_SECRET
	})

	let symbols

	try{
		let products = await kraken.loadProducts()
		let productKeys = Object.keys(products)
		symbols = getUSDSymbols(productKeys)
	}catch(err){
		console.log(err)
	}

	init(symbols)
	run(kraken, symbols)
}

function init(symbols){
	trendmaster.init(symbols)
}

function run(market, symbols){
	setTimeout(async () => {

		console.log(chalk.green('[RUNNING]'))

		try{
			let map = await strategize(market, symbols)

			if (map !== undefined){
				console.log(map)
			}

			run(market, symbols)
		}catch(err){
			console.log(err)
		}

	}, COOLDOWN) // run every minute
}

function getUSDSymbols(symbols){
	let usdSymbols = []

	for (let i = 0; i < symbols.length; i++){
		if(symbols[i].includes('USD') && !symbols[i].includes('.d')){
			usdSymbols.push(symbols[i])
		}
	}

	return usdSymbols
}

async function strategize(market, symbols){
	let map
	let statuses = []

	for(let i = 0; i < symbols.length; i++){
		try{
			let status = await trendmaster.determine(market, symbols[i])

			if (status !== undefined){
				statuses.push(status)
			}
		}catch(err){
			console.log(err)
		}
	}

	if (statuses.length > 1){
		map = _.zipObject(symbols, statuses)

		return map
	}

	return
}

main()
