const Exchange = require('../exchange');
const WebSocket = require('ws');

class Binance extends Exchange {

	constructor(options) {
		super(options);

    this.id = 'binance';

    this.pairs = [
      'NULSBNB',
      'VENBNB',
      'BNBBTC',
      'NULSBTC',
      'CTRBTC',
      'NEOBTC',
      'NULSETH',
      'LINKBTC',
      'SALTBTC',
      'IOTABTC',
      'ETCBTC',
      'ASTETH',
      'KNCBTC',
      'WTCBTC',
      'SNGLSBTC',
      'EOSETH',
      'SNTETH',
      'MCOETH',
      'BTCUSDT',
      'OAXETH',
      'OMGETH',
      'GASBTC',
      'BQXETH',
      'WTCETH',
      'QTUMETH',
      'BNTETH',
      'DNTETH',
      'ICNETH',
      'SNMBTC',
      'SNMETH',
      'SNGLSETH',
      'BQXBTC',
      'NEOETH',
      'KNCETH',
      'STRATETH',
      'ZRXETH',
      'QTUMBTC',
      'FUNETH',
      'LTCBTC',
      'LINKETH',
      'ETHBTC',
      'XVGETH',
      'STRATBTC',
      'ZRXBTC',
      'IOTAETH',
      'BCCBTC',
      'CTRETH',
      'OMGBTC',
      'MCOBTC',
      'SALTETH',
      'ADABTC',
      'ADAETH',
      'ADXBNB',
      'ADXBTC',
      'ADXETH',
      'AEBNB',
      'AEBTC',
      'AEETH',
      'AIONBNB',
      'AIONBTC',
      'AIONETH',
      'AMBBNB',
      'AMBBTC',
      'AMBETH',
      'APPCBNB',
      'APPCBTC',
      'APPCETH',
      'ARKBTC',
      'ARKETH',
      'ARNBTC',
      'ARNETH',
      'ASTBTC',
      'BATBNB',
      'BATBTC',
      'BATETH',
      'BCCBNB',
      'BCCETH',
      'BCCUSDT',
      'BCDBTC',
      'BCDETH',
      'BCPTBNB',
      'BCPTBTC',
      'BCPTETH',
      'BLZBNB',
      'BLZBTC',
      'BLZETH',
      'BNBETH',
      'BNTBTC',
      'BRDBNB',
      'BRDBTC',
      'BRDETH',
      'BTGBTC',
      'BTGETH',
      'BTSBNB',
      'BTSBTC',
      'BTSETH',
      'CDTBTC',
      'CDTETH',
      'CHATBTC',
      'CHATETH',
      'CMTBNB',
      'CMTBTC',
      'CMTETH',
      'CNDBNB',
      'CNDBTC',
      'CNDETH',
      'DASHBTC',
      'DASHETH',
      'DGDBTC',
      'DGDETH',
      'DLTBNB',
      'DLTBTC',
      'DLTETH',
      'DNTBTC',
      'EDOBTC',
      'EDOETH',
      'ELFBTC',
      'ELFETH',
      'ENGBTC',
      'ENGETH',
      'ENJBTC',
      'ENJETH',
      'EOSBTC',
      'ETCETH',
      'EVXBTC',
      'EVXETH',
      'FUELBTC',
      'FUELETH',
      'FUNBTC',
      'GTOBNB',
      'GTOBTC',
      'GTOETH',
      'GVTBTC',
      'GVTETH',
      'GXSBTC',
      'GXSETH',
      'HSRBTC',
      'HSRETH',
      'ICNBTC',
      'ICXBNB',
      'ICXBTC',
      'ICXETH',
      'INSBTC',
      'INSETH',
      'IOSTBTC',
      'IOSTETH',
      'IOTABNB',
      'KMDBTC',
      'KMDETH',
      'LENDBTC',
      'LENDETH',
      'LRCBTC',
      'LRCETH',
      'LSKBNB',
      'LSKBTC',
      'LSKETH',
      'LTCBNB',
      'LTCETH',
      'LTCUSDT',
      'LUNBTC',
      'LUNETH',
      'MANABTC',
      'MANAETH',
      'MCOBNB',
      'MDABTC',
      'MDAETH',
      'MODBTC',
      'MODETH',
      'MTHBTC',
      'MTHETH',
      'MTLBTC',
      'MTLETH',
      'NANOBNB',
      'NANOBTC',
      'NANOETH',
      'NAVBNB',
      'NAVBTC',
      'NAVETH',
      'NCASHBNB',
      'NCASHBTC',
      'NCASHETH',
      'NEBLBNB',
      'NEBLBTC',
      'NEBLETH',
      'NEOBNB',
      'NEOUSDT',
      'OAXBTC',
      'ONTBNB',
      'ONTBTC',
      'ONTETH',
      'OSTBNB',
      'OSTBTC',
      'OSTETH',
      'PIVXBNB',
      'PIVXBTC',
      'PIVXETH',
      'POABNB',
      'POABTC',
      'POAETH',
      'POEBTC',
      'POEETH',
      'POWRBNB',
      'POWRBTC',
      'POWRETH',
      'PPTBTC',
      'PPTETH',
      'QLCBTC',
      'QLCETH',
      'QSPBNB',
      'QSPBTC',
      'QSPETH',
      'QTUMBNB',
      'QTUMUSDT',
      'RCNBNB',
      'RCNBTC',
      'RCNETH',
      'RDNBNB',
      'RDNBTC',
      'RDNETH',
      'REQBTC',
      'REQETH',
      'RLCBNB',
      'RLCBTC',
      'RLCETH',
      'RPXBNB',
      'RPXBTC',
      'RPXETH',
      'SNTBTC',
      'STEEMBNB',
      'STEEMBTC',
      'STEEMETH',
      'STORJBTC',
      'STORJETH',
      'STORMBNB',
      'STORMBTC',
      'STORMETH',
      'SUBBTC',
      'SUBETH',
      'SYSBNB',
      'SYSBTC',
      'SYSETH',
      'TNBBTC',
      'TNBETH',
      'TNTBTC',
      'TNTETH',
      'TRIGBNB',
      'TRIGBTC',
      'TRIGETH',
      'TRXBTC',
      'TRXETH',
      'VENBTC',
      'VENETH',
      'VIABNB',
      'VIABTC',
      'VIAETH',
      'VIBBTC',
      'VIBEBTC',
      'VIBEETH',
      'VIBETH',
      'WABIBNB',
      'WABIBTC',
      'WABIETH',
      'WANBNB',
      'WANBTC',
      'WANETH',
      'WAVESBNB',
      'WAVESBTC',
      'WAVESETH',
      'WINGSBTC',
      'WINGSETH',
      'WPRBTC',
      'WPRETH',
      'WTCBNB',
      'XEMBNB',
      'XEMBTC',
      'XEMETH',
      'XLMBNB',
      'XLMBTC',
      'XLMETH',
      'XMRBTC',
      'XMRETH',
      'XRPBTC',
      'XRPETH',
      'XVGBTC',
      'XZCBNB',
      'XZCBTC',
      'XZCETH',
      'YOYOBNB',
      'YOYOBTC',
      'YOYOETH',
      'ZECBTC',
      'ZECETH',
      'ZILBNB',
      'ZILBTC',
      'ZILETH',
      'BNBUSDT',
      'ETHUSDT'
    ]

    this.mapping = pair => {
      pair = pair.replace(/USD$/, 'USDT');

      if (this.pairs.indexOf(pair) !== -1) {
        return pair.toLowerCase();
      }

      return false;
    }

		this.options = Object.assign({
			url: () => {
        return 'wss://stream.binance.com:9443/ws/' + this.pair + '@trade';
      },
		}, this.options);
	}

	connect(pair) {
    if (!super.connect(pair))  
      return;

    this.server = new WebSocket(this.getUrl(this.mapping[pair]));

		this.server.on('message', event => this.emitData(this.format(event)));

		this.server.on('open', this.emitOpen.bind(this));

		this.server.on('close', this.emitClose.bind(this));

		this.server.on('error', this.emitError.bind(this));
	}

	disconnect() {
    if (!super.disconnect())  
      return;

    if (this.server && this.server.readyState < 2) {
      this.server.close();
    }
	}

	format(event) {
		const trade = JSON.parse(event);

    if (trade && trade.t) {
      return [[
        this.id + trade.t,
        trade.E,
        +trade.p,
        +trade.q,
        trade.m ? 0 : 1
      ]]
    }

		return false;
	}

}

module.exports = Binance;