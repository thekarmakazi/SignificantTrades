import Vue from 'vue'
import Axios from 'axios'
import path from 'path';


import Kraken from '../exchanges/kraken'
import Bitmex from '../exchanges/bitmex'
import Huobi from '../exchanges/huobi'
import Binance from '../exchanges/binance'
import BinanceFutures from '../exchanges/binance-futures'
import Bitfinex from '../exchanges/bitfinex'
import Bitstamp from '../exchanges/bitstamp'
import Gdax from '../exchanges/gdax'
import Hitbtc from '../exchanges/hitbtc'
import Okex from '../exchanges/okex'
import Poloniex from '../exchanges/poloniex'
import Deribit from '../exchanges/deribit'
import Bybit from '../exchanges/bybit'
import Ftx from '../exchanges/ftx'

import store from '../store'
import { FIRST_TIME, API_SUPPORTED_PAIRS, API_URL, formatAmount } from '../utils/helpers'

const QUEUE = {};
const REFS = {}
const SUMS = {
  vbuy: 0,
  vsell: 0,
  lbuy: 0,
  lsell: 0,
  cbuy: 0,
  csell: 0
}

let sumsInterval = null;
let queueInterval = null;
let activeExchanges = [];

const emitter = new Vue({
  data() {
    return {
      exchanges: [
        new Bitmex(),
        new Bitfinex(),
        new Binance(),
        new BinanceFutures(),
        new Bitstamp(),
        new Gdax(),
        new Poloniex(),
        new Kraken(),
        new Okex(),
        new Deribit(),
        new Huobi(),
        new Hitbtc(),
        new Bybit(),
        new Ftx()
      ],

      _pair: null,
    }
  },
  computed: {
    pair() {
      return store.state.settings.pair
    },
    timeframe() {
      return store.state.settings.timeframe
    },
    exchangesSettings() {
      return store.state.settings.exchanges
    },
    showChart() {
      return store.state.settings.showChart
    },
    showSlippage() {
      return store.state.settings.showSlippage
    },
    aggregateTrades() {
      return store.state.settings.aggregateTrades
    },
    actives() {
      return store.state.app.actives
    },
    isLoading() {
      return store.state.app.isLoading
    },
    preferQuoteCurrencySize() {
      return store.state.settings.preferQuoteCurrencySize
    },
    showStats() {
      return store.state.settings.showStats
    },
    showCounters() {
      return store.state.settings.showCounters
    }
  },
  created() {
    if (FIRST_TIME) {
      this.getOptimalThresholds(store.state.settings.pair);
    }

    store.subscribe((mutation) => {
      switch (mutation.type) {
        case 'settings/SET_PAIR':
          this.getOptimalThresholds(mutation.payload)
        break;
        case 'settings/TOGGLE_AGGREGATION':
          if (!this.toggleAggregation && queueInterval) {
            this.clearQueueInterval();
          } else if (this.toggleAggregation && !queueInterval) {
            this.setupQueueInterval();
          }
        break;
        case 'settings/TOGGLE_STATS':
        case 'settings/TOGGLE_COUNTERS':
          if (!this.showStats && !this.showCounters && sumsInterval) {
            this.clearSumsInterval();
          } else if (this.showStats ||this.showCounters && !sumsInterval) {
            this.setupSumsInterval();
          }
        break;
      }
    });

    this.exchanges.forEach(exchange => {
      exchange.on('trades', trades => {
        if (!trades || !trades.length) {
          return
        }
        
        const length = trades.length;

        const doAggr = this.aggregateTrades;
        const doSlip = this.showSlippage;
        
        if (!doAggr) {
          for (let i = 0; i < length; i++) {
            const trade = trades[i];

            if (sumsInterval !== null && activeExchanges.indexOf(trade.exchange) !== -1) {
              const size = (this.preferQuoteCurrencySize ? trade.price : 1) * trade.size;

              if (!SUMS.timestamp) {
                SUMS.timestamp = trade.timestamp;
              }
              
              if (trade.liquidation) {
                SUMS['l' + trade.side] += size
                continue;
              }
  
              SUMS['c' + trade.side]++
              SUMS['v' + trade.side] += size
            }

            doSlip && this.calculateSlippage(trades[i])
          }

          this.$emit('trades', trades)
          this.$emit('trades.aggr', trades)
        } else {
          const aggrTrades = []

          for (let i = 0; i < length; i++) {
            const trade = trades[i];

            if (sumsInterval !== null && activeExchanges.indexOf(trade.exchange) !== -1) {
              const size = (this.preferQuoteCurrencySize ? trade.price : 1) * trade.size;

              if (!SUMS.timestamp) {
                SUMS.timestamp = trade.timestamp;
              }
              
              if (trade.liquidation) {
                SUMS['l' + trade.side] += size
              } else {
                SUMS['c' + trade.side]++
                SUMS['v' + trade.side] += size
              }
            }

            trade.ref = REFS[exchange.id] || trade.price;

            REFS[exchange.id] = trade.price;

            if (QUEUE[exchange.id]) {
              const queuedTrade = QUEUE[exchange.id]

              if (queuedTrade.timestamp === trade.timestamp && queuedTrade.side === trade.side) {
                queuedTrade.size += trade.size
                queuedTrade.price += trade.price * trade.size
                queuedTrade.high = Math.max(queuedTrade.high || queuedTrade.price / queuedTrade.size, trade.price)
                queuedTrade.low = Math.min(queuedTrade.low || queuedTrade.price / queuedTrade.size, trade.price)
                continue;
              } else {
                queuedTrade.price /= queuedTrade.size
                doSlip && this.calculateSlippage(queuedTrade)
                aggrTrades.unshift(queuedTrade)
              }
            }
            
            QUEUE[exchange.id] = Object.assign({}, trade);
            QUEUE[exchange.id].high = Math.max(trade.ref, trade.price)
            QUEUE[exchange.id].low = Math.min(trade.ref, trade.price)
            QUEUE[exchange.id].price *= QUEUE[exchange.id].size
          
          }
          
          this.$emit('trades', trades)

          if (aggrTrades.length) {
            this.$emit('trades.aggr', aggrTrades)
          }
        }
      })

      exchange.on('open', event => {
        console.log(`[socket.exchange.on.open] ${exchange.id} opened`)

        this.$emit('connected', exchange.id)
      })

      exchange.on('close', event => {
        console.log(`[socket.exchange.on.close] ${exchange.id} closed`)

        this.$emit('disconnected', exchange.id)

        if (exchange.shouldBeConnected && !this.exchangesSettings[exchange.id].disabled) {
          exchange.reconnect(this.pair)
        }
      })

      exchange.on('match', pair => {
        console.log(`[socket.exchange.on.match] ${exchange.id} matched ${pair}`)
        store.commit('settings/SET_EXCHANGE_MATCH', {
          exchange: exchange.id,
          match: pair
        })
      })

      exchange.on('error', event => {
        console.log(`[socket.exchange.on.error] ${exchange.id} reported an error`)
      })

      store.dispatch('app/refreshExchange', exchange.id)
    })
  },
  methods: {
    getBarTrades(ts) {
      return TRADES && TRADES[ts];
    },
    initialize() {
      console.log(`[sockets] initializing ${this.exchanges.length} exchange(s)`)

      setTimeout(this.connectExchanges.bind(this))

      this.clearQueueInterval();
      if (store.state.settings.aggregateTrades) {
        this.setupQueueInterval();
      }

      this.clearSumsInterval();
      if (store.state.settings.showCounters || store.state.settings.showStats) {
        this.setupSumsInterval();
      }
    },
    connectExchanges(pair = null) {
      this.disconnectExchanges()

      if (!pair && !this.pair) {
        store.dispatch('app/showNotice', {
          type: 'error',
          title: `No pair.`
        });
      }

      if (pair) {
        this.pair = pair.toUpperCase()
      }

      console.log(`[socket.connect] connecting to ${this.pair}`)

      store.dispatch('app/showNotice', {
        type: 'info',
        title: 'Fetching the latest products, please wait.'
      });

      Promise.all(this.exchanges.map(exchange => exchange.validatePair(this.pair))).then(() => {
        let validExchanges = this.exchanges.filter(exchange => exchange.valid)

        if (!validExchanges.length) {
          store.dispatch('app/showNotice', {
            type: 'error',
            delay: false,
            title: `Cannot find ${this.pair}, sorry`
          });

          return
        }

        if (this._pair !== this.pair) {
          this.$emit('pairing', this.pair, this.canFetch())

          this._pair = this.pair
        }

        const successfullMatches = validExchanges.length;

        console.log(`[socket.connect] ${successfullMatches} successfully matched with ${this.pair}`)

        validExchanges = validExchanges.filter(exchange => !this.exchangesSettings[exchange.id].disabled)

        store.dispatch('app/showNotice', {
          type: 'info',
          title: `Connecting to ${validExchanges.length} exchange${validExchanges.length > 1 ? 's' : ''}`
        });

        console.log(`[socket.connect] batch connect to ${validExchanges.map(a => a.id).join(' / ')}`)

        Promise.all(validExchanges.map(exchange => exchange.connect())).then(() => {
          store.dispatch('app/showNotice', {
            type: 'success',
            title: `Subscribed to ${this.pair} on ${validExchanges.length} exchange${validExchanges.length > 1 ? 's' : ''}` + (validExchanges.length < successfullMatches ? ` (${successfullMatches - validExchanges.length} hidden)` : '')
          });
        })
      })
    },
    disconnectExchanges() {
      console.log(`[socket.connect] disconnect exchanges asynchronously`)

      this.exchanges.forEach(exchange => exchange.disconnect())
    },
    getExchangeById(id) {
      for (let exchange of this.exchanges) {
        if (exchange.id === id) {
          return exchange
        }
      }

      return null
    },
    setupSumsInterval() {
      console.log(`[socket] setup sums interval`)

      sumsInterval = setInterval(this.emitSums.bind(this), 1000);
    },
    clearSumsInterval() {
      if (sumsInterval) {
        console.log(`[socket] clear sums interval`)

        clearInterval(sumsInterval)
        sumsInterval = null;
      }
    },
    emitSums() {
      if (SUMS.timestamp) {
        this.$emit('sums', SUMS);

        SUMS.timestamp = null
        SUMS.vbuy = 0
        SUMS.vsell = 0
        SUMS.cbuy = 0
        SUMS.csell = 0
        SUMS.lbuy = 0
        SUMS.lsell = 0
      }
    },
    setupQueueInterval() {
      console.log(`[socket] setup queue interval`)

      queueInterval = setInterval(this.emitQueue.bind(this), 50);
    },
    clearQueueInterval() {
      if (queueInterval) {
        console.log(`[socket] clear queue interval`)

        clearInterval(queueInterval)
        queueInterval = null;
      }
    },
    emitQueue() {
      const now = +new Date();
      const inQueue = Object.keys(QUEUE);

      const output = [];

      for (let i = 0; i < inQueue.length; i++) {
        const trade = QUEUE[inQueue[i]];
        if (now - trade.timestamp > 50) {
          trade.price /= trade.size
          this.calculateSlippage(trade)
          output.push(trade)

          delete QUEUE[inQueue[i]]
        }
      }

      if (output.length) {
        this.$emit('trades.aggr', output);
      }
    },
    calculateSlippage(trade) {
      const type = this.showSlippage;
      
      if (type === 'price') {
        trade.slippage = (trade.ref - trade.price) * -1;
      } else if (type === 'bps') {
        trade.slippage = Math.floor((trade.high - trade.low) / trade.low * 10000)
      }

      return trade.slippage
    },
    canFetch() {
      return API_URL && (!API_SUPPORTED_PAIRS || API_SUPPORTED_PAIRS.indexOf(this.pair) !== -1)
    },
    getApiUrl(from, to) {
      let url = API_URL

      url = url.replace(/\{from\}/, from)
      url = url.replace(/\{to\}/, to)
      url = url.replace(/\{timeframe\}/, this.timeframe * 1000)
      url = url.replace(/\{pair\}/, this.pair.toLowerCase())
      url = url.replace(/\{exchanges\}/, this.actives.join('+'))

      return url
    },
    fetchHistoricalData(from, to) {
      const url = this.getApiUrl(from, to)

      if (this.lastFetchUrl === url) {
        return Promise.reject()
      }

      this.lastFetchUrl = url

      store.commit('app/TOGGLE_LOADING', true)

      this.$emit('fetchStart', to - from)

      return new Promise((resolve, reject) => {
        Axios.get(url, {
          onDownloadProgress: e => {
            this.$emit('loadingProgress', {
              loaded: e.loaded,
              total: e.total,
              progress: e.loaded / e.total
            })

            this._fetchedBytes += e.loaded
          }
        })
          .then(response => {
            if (!response.data || typeof response.data !== 'object') {
              return reject()
            }

            const format = response.data.format
            let data = response.data.results

            if (!data.length) {
              return reject()
            }

            switch (response.data.format) {
              case 'point':
                ;({ from, to, data } = this.normalisePoints(data))
                break
              default:
                break
            }

            const output = {
              format: format,
              data: data,
              from: from,
              to: to
            }

            this.$emit('historical', output)

            resolve(output)
          })
          .catch(err => {
            err &&
            store.dispatch('app/showNotice', {
              type: 'error',
              message: `API error (${err.response && err.response.data && err.response.data.error ? err.response.data.error : err.message || 'unknown error'})`
            });

            reject()
          })
          .then(() => {
            this._fetchedTime += to - from

            this.$emit('fetchEnd', to - from)

            store.commit('app/TOGGLE_LOADING', false)
          })
      })
    },
    normalisePoints(data) {
      if (!data || !data.length) {
        return data
      }

      const initialTs = +new Date(data[0].time) / 1000
      const exchanges = []

      let refs = {}

      for (let i = data.length - 1; i >= 0; i--) {
        refs[data[i].exchange] = data[i].open
        data[i].vbuy = data[i].vol_buy
        data[i].vsell = data[i].vol_sell
        data[i].cbuy = data[i].count_buy
        data[i].csell = data[i].count_sell
        data[i].lbuy = data[i].liquidation_buy
        data[i].lsell = data[i].liquidation_sell
        data[i].timestamp = +new Date(data[i].time) / 1000

        delete data[i].time
        delete data[i].count
        delete data[i].vol
        delete data[i].vol_buy
        delete data[i].vol_sell
        delete data[i].count_buy
        delete data[i].count_sell
        delete data[i].liquidation_buy
        delete data[i].liquidation_sell

        if (data[i].time === initialTs) {
          delete refs[data[i].exchange]
          exchanges.push(data[i].exchange)
        }
      }

      for (let exchange in refs) {
        data.unshift({
          timestamp: initialTs,
          exchange: exchange,
          open: refs[exchange],
          high: refs[exchange],
          low: refs[exchange],
          close: refs[exchange],
          vbuy: 0,
          vsell: 0,
          lbuy: 0,
          lsell: 0,
          cbuy: 0,
          csell: 0
        })

        exchanges.push(exchange)
      }

      return {
        data,
        exchanges,
        from: data[0].timestamp,
        to: data[data.length - 1].timestamp
      }
    },
    getOptimalThresholds() {
      if (!API_URL) {
        return
      }

      Axios.get(path.join(API_URL, 'ratio')).then(response => response.data).then(({ ratio, pair }) => {
        const thresholds = [50000, 100000, 1000000, 10000000];

        for (let threshold of thresholds) {
          threshold *= ratio
        }

        store.dispatch('app/showNotice', {
          type: 'error',
          title: `Thresholds for ${pair}<br>${thresholds.map(a => formatAmount(a)).join(', ')}`,
          click: (event) => {
            console.log('not implemented')
          }
        });
      })
    }
  }
})

export default emitter
