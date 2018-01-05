# hydra
A dumb - but functional - cryptocurrency trading bot using [CCXT](https://github.com/ccxt/ccxt)

## Configuration

Navigate to src/script.js and change the following values from your **Kraken API account**: 
```javascript
const API_KEY = 'kraken_api' // Kraken API key
const API_SECRET = 'kraken_secret' // Kraken API secret
```

Navigate to src/trader.js and change the following values from your **Twilio API account**: _Eventually this will not be required._
```javascript
const accountSid = 'twilio_sid'                    // Twilio api sid
const authToken = 'twilio_auth'                    // Twilio api auth token
const client = new twilio(accountSid, authToken)
const twilioSender = 'phonenumber'                 // twilio api phone number
const twilioReciever = 'phonenumber'               // user phone number
```
## Usage 

Navigate to the project root and run:
```
node src/script.js
```
The program should launch and the program will start fetching data in order to make trading to decisions.

_You will see colored output to your terminal._

## Understanding

Hydra is not _yet_ a very smart trading bot. To understand what does look at src/trendmaster.js

```javascript

const SHORT_PERIOD = 12
const MIDDLE_PERIOD = 20
const LONG_PERIOD = 26
const SUPER_LONG_PERIOD = 42
const SIGNAL = 9

let lastClose = map[symbol].lastClose
let period12 = map[symbol].period12
let period20 = map[symbol].period20
let period26 = map[symbol].period26
let period42 = map[symbol].period42
let signal = map[symbol].signal
let macd = map[symbol].macd
let histogram = map[symbol].histogram
let topPrices = map[symbol].topPrices
let paidAt = map[symbol].paidAt

try{
  let recentClose = await getRecentClose(market, symbol)

  if(lastClose.length < SHORT_PERIOD){
    console.log(chalk.blue('[' + symbol + '] ') + chalk.yellow('Getting more data for short period... ') + chalk.magenta(lastClose.length))
    return
  }else{
    calculateEMA(period12, lastClose, symbol, SHORT_PERIOD)
  }

// ...
```
Here you can see some of the tools hydra uses to make decisions. Based on the timer found src/script.js 
```javascript
const RUN_COOLDOWN = 60000 // 15 minutes
```
Hydra will get the last closing price of a given currency and store it to an array. Once enough data is gathered, Hydra will use that data to calculate different EMA's and the MACD of a currency.  These are then used to perform simple trading strategies like EMA crossovers
```javascript

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

  // ...

  return {
    bool: false,
    reason: ''
  }
}
```

## Todo
This project was hastly thrown together in the middle of a web devlopement class at university while I was bored during lecture. For that reason, the code doesn't look too great. So, clean up and modularization is more important than anything else.

Also, if anyone has a good trading strategy they would like to give, this project is built with the [CCXT](https://github.com/ccxt/ccxt)javascript library, so we could easily using the same trading bot on a plethora of different markets: (againg see [CCXT](https://github.com/ccxt/ccxt) for more info).
