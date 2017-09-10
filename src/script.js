const ccxt = require('ccxt')
const _ = require('lodash')
const chalk = require('chalk')
const figlet = require('figlet')

const trader = require('./trader.js')
const trendmaster = require('./trendmaster.js')

const run_cooldown = 900000
const API_KEY = 'TBGwtBty2vkuM0xfbPSFrhIlbAcc3tEjdfxAtPtud2iT0BiNlrZXFf/j'
const API_SECRET = 'Obi30JzVzkGYcs7GFAeIocN+wMHUnQ3rxEfzEKCUC7sfSw+jVdQC/XgcCfbk2VOXwYKMeh1DFhQhuJI61upVwQ=='

const figletOptions = {
	font: 'jazmine',
	horizontalLayout: 'default',
	verticalLayout: 'default'
}

async function main(){
	let kraken = ccxt.kraken({
		apiKey: API_KEY,
		secret: API_SECRET
	})

	console.log(chalk.magenta(figlet.textSync('Hydra', figletOptions)))
	console.log('\nWelcome to Hydra: A trading bot for Kraken.com\n')

	try{
		let products = await kraken.loadMarkets()
		let productKeys = Object.keys(products)
		let symbols = getUSDSymbols(productKeys)

		init(symbols)
		run(kraken, symbols)


	}catch(err){
		console.log(err)
	}
}

function init(symbols){
	trendmaster.init(symbols)
}

async function run(market, symbols){
	try{
		console.log(chalk.green('[____Running____]'))
		let results = await strategize(market, symbols)
		if (results !== undefined){
				trader.trade(results, market) // evaluate trade possibilites
		}
		setTimeout(async () => { await run(market, symbols) }, run_cooldown)
	}catch(err){
		console.log(err)
	}
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

	// throttle this to avoid kraken timing out our requests
	for(let i = 0; i < symbols.length; i++){
			try{
				let sellOptions = await trendmaster.determine(market, symbols[i])

				if (sellOptions !== undefined){
					results.push(sellOptions)
					console.log(sellOptions)
				}

				if (i === symbols.length - 1 && results.length > 0){
						return results
				}
			}catch(err){
				console.log(err)
			}
	}
}

main()
