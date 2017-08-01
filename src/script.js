const ccxt = require('ccxt')

const teller = require('./teller.js')

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

	getCurrencyPrices(kraken, symbols)
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

function getCurrencyPrices(market, symbols){
	for (let i = 0; i < symbols.length; i++){
		setInterval(async () => {
		
			let orderBook = await market.fetchOrderBook(symbols[i])
			let bid = orderBook.bids.length ? orderBook.bids[0][0] : undefined
			let ask = orderBook.bids.length ? orderBook.asks[0][0] : undefined
			
			teller.evaluate({ symbol: symbol[i], bid, ask})

		},7000)
	}
}

main()
