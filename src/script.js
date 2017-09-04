const ccxt = require('ccxt')
const _ = require('lodash')
const chalk = require('chalk')

const trader = require('./trader.js')
const trendmaster = require('./trendmaster.js')

const COOLDOWN = 1800000 // 30 minutes
const TRADE_COOLDOWN = 2500
const API_KEY = 'TBGwtBty2vkuM0xfbPSFrhIlbAcc3tEjdfxAtPtud2iT0BiNlrZXFf/j'
const API_SECRET = 'Obi30JzVzkGYcs7GFAeIocN+wMHUnQ3rxEfzEKCUC7sfSw+jVdQC/XgcCfbk2VOXwYKMeh1DFhQhuJI61upVwQ=='

async function main(){
	let kraken = ccxt.kraken({
		apiKey: API_KEY,
		secret: API_SECRET
	})

	try{
		let products = await kraken.loadMarkets()
		let productKeys = Object.keys(products)
		let symbols = getUSDSymbols(productKeys)
		console.log(symbols)

		init(symbols)
		run(kraken, symbols)
	}catch(err){
		console.log(err)
	}
}

function init(symbols){
	trendmaster.init(symbols)
}

function run(market, symbols){
	setTimeout(async () => {

		console.log(chalk.green('[RUNNING]'))

		try{
			let results = await strategize(market, symbols)

			if (results !== undefined){
				setTimeout(async () => {
					trader.trade(results, market)
				}, TRADE_COOLDOWN)
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
	let results = []

	for(let i = 0; i < symbols.length; i++){
		try{
			let sellOptions = await trendmaster.determine(market, symbols[i])

			if (sellOptions !== undefined){
				results.push(sellOptions)
			}

		}catch(err){
			console.log(err)
		}
	}

	if (results.length === symbols.length){
		return results
	}

	return
}

main()
