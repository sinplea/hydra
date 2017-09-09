const ccxt = require('ccxt')
const _ = require('lodash')
const chalk = require('chalk')
const CronJob = require('cron').CronJob
const throttledQueue = require('throttled-queue')

const trader = require('./trader.js')
const trendmaster = require('./trendmaster.js')

const stratigizeThrottle = throttledQueue(1, 2000) // 1 request every 2 seconds
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

		init(symbols)
		run(kraken, symbols)

		console.log(chalk.magenta('Hydra running.'))
	}catch(err){
		console.log(err)
	}
}

function init(symbols){
	trendmaster.init(symbols)
}

function run(market, symbols){
	let job = new CronJob({
		cronTime: '0 */30 * * * *',
		onTick: async function(){
			console.log(chalk.green('[RUNNING]'))
			console.log(chalk.green('*************'))

			try{
				let results = await strategize(market, symbols)

				if (results !== undefined){
						trader.trade(results, market) // evaluate trade possibilites
				}
			}catch(err){
				console.log(err)
			}
		},
		start: true,
		timeZone: 'America/Chicago'
	})

	job.start()
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
		stratigizeThrottle(async function(){
			try{
				let sellOptions = await trendmaster.determine(market, symbols[i])

				if (sellOptions !== undefined){
					results.push(sellOptions)
				}

			}catch(err){
				console.log(err)
			}
		})
	}

	if (results.length === symbols.length){
		return results
	}

	return
}

main()
