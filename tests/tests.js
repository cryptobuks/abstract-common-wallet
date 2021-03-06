var bitcoin = require('bitcoinjs-lib')
var hexParser = require('bitcoin-tx-hex-to-json')
var express = require('express')
var expressCommonWallet = require('express-common-wallet')
var bodyParser = require('body-parser')

var app = express()

var __nonces = {}
var commonWalletNonceStore = {
  get: function (address, callback) {
    callback(false, __nonces[address])
  },
  set: function (address, nonce, callback) {
    __nonces[address] = nonce
    callback(false, true)
  }
}

app.use(bodyParser())

app.use('/', expressCommonWallet({
  commonWalletNonceStore: commonWalletNonceStore
}))

var port = 3564
var serverRootUrl = 'http://localhost:' + port

// generates a private key from a seed and a network. This function returns
// the same private key as the deprecated bitcoinjs-lib wallet object. This may be subject
// to change in the future.
function WIFKeyFromSeed (seed, network) {
  network = (network === 'testnet') ? bitcoin.networks.testnet : null
  var hash = bitcoin.crypto.sha256(seed)
  var hdnode = bitcoin.HDNode.fromSeedBuffer(hash, network)
  var temp = hdnode.deriveHardened(0).derive(0)
  var key = new bitcoin.ECKey(temp.derive(0).privKey.d)
  var wif = key.toWIF(network)
  return wif
}

var message = 'common wallet is great!'
var transactionHex = '01000000017b1eabe0209b1fe794124575ef807057c77ada2138ae4fa8d6c4de0398a14f3f0000000000ffffffff01f0ca052a010000001976a914cbc20a7664f2f69e5355aa427045bc15e7c6c77288ac00000000'
var walletAddress

module.exports.signMessage = function (test, seed, common) {
  test('signing a message with a private key', function (t) {
    common.setup(test, function (err, commonWallet) {
      if (err) { } // TODO
      commonWallet.signMessage(message, function (err, signedMessage) {
        if (err) { } // TODO
        var wif = WIFKeyFromSeed(seed, commonWallet.network)
        var ECKey = bitcoin.ECKey.fromWIF(wif)

        walletAddress = ECKey.pub.getAddress((commonWallet.network === 'testnet') ? bitcoin.networks.testnet : null).toString()

        var network = (commonWallet.network === 'testnet') ? bitcoin.networks.testnet : null
        var expectedMessage = bitcoin.Message.sign(ECKey, message, network).toString('base64')
        t.ok(signedMessage !== null, 'signed message is not null')
        t.equal(signedMessage, expectedMessage, 'signed message should be ' + expectedMessage)
        t.end()
      })
    })
  })
}

module.exports.signTransaction = function (test, seed, common) {
  test('signing a transaction with a wif', function (t) {
    common.setup(test, function (err, commonWallet) {
      if (err) { } // TODO
      commonWallet.signRawTransaction(transactionHex, function (err, signedHex, txid) {
        if (err) { } // TODO
        var wif = WIFKeyFromSeed(seed, commonWallet.network)
        var ECKey = bitcoin.ECKey.fromWIF(wif)

        var _tx = bitcoin.Transaction.fromHex(transactionHex)
        var transaction = bitcoin.TransactionBuilder.fromTransaction(_tx)
        transaction.sign(0, ECKey)
        var builtTx = transaction.build()
        var expectedSignedHex = builtTx.toHex()
        var expectedTxid = builtTx.getId()

        t.ok(signedHex !== null, 'signed hex is not null')
        t.equal(signedHex, expectedSignedHex, 'signed hex should be ' + expectedSignedHex)
        t.equal(txid, expectedTxid, 'txid of signed hex should be ' + expectedTxid)
        t.end()
      })
    })
  })
}

module.exports.signTransactionInput = function (test, seed, common) {
  test('signing a transaction with a wif', function (t) {
    common.setup(test, function (err, commonWallet) {
      if (err) { } // TODO
      commonWallet.signRawTransaction({txHex: transactionHex, index: 0}, function (err, signedHex, txid) {
        if (err) { } // TODO
        var wif = WIFKeyFromSeed(seed, commonWallet.network)
        var ECKey = bitcoin.ECKey.fromWIF(wif)

        var _tx = bitcoin.Transaction.fromHex(transactionHex)
        var transaction = bitcoin.TransactionBuilder.fromTransaction(_tx)
        transaction.sign(0, ECKey)
        var builtTx = transaction.build()
        var expectedSignedHex = builtTx.toHex()
        var expectedTxid = builtTx.getId()

        t.ok(signedHex !== null, 'signed hex is not null')
        t.equal(signedHex, expectedSignedHex, 'signed hex should be ' + expectedSignedHex)
        t.equal(txid, expectedTxid, 'txid of signed hex should be ' + expectedTxid)
        t.end()
      })
    })
  })
}

module.exports.createTransaction = function (test, seed, common) {
  test('create a transaction using wallet credentials', function (t) {
    common.setup(test, function (err, commonWallet) {
      if (err) { } // TODO
      commonWallet.createTransaction({
        value: 90000,
        destinationAddress: 'mghg74ZBppLfhEUmzxK4Cwt1FCqiEtYbXS',
        propagate: true
      }, function (err, signedTransactionHex) {
        if (err) { } // TODO
        t.ok(signedTransactionHex !== null, 'Signed transaction hex is non-null')
        var json = hexParser(signedTransactionHex)
        t.ok(json.vin[0].scriptSig.hex.length > 10, 'the input was signed')
        t.ok(json.vout[0].value === 90000, 'transaction sends 90000 satoshi')
        t.ok(json.vout[0].scriptPubKey.addresses[0] === 'mghg74ZBppLfhEUmzxK4Cwt1FCqiEtYbXS', 'first output is mghg74ZBppLfhEUmzxK4Cwt1FCqiEtYbXS')
        t.ok(json.vin[0].addresses[0] === walletAddress, 'transaction is sent from the wallet address')
        t.end()
      })
    })
  })
}

module.exports.createTransactionSkipSign = function (test, seed, common) {
  test('create a transaction using wallet credentials, skipSign', function (t) {
    common.setup(test, function (err, commonWallet) {
      if (err) { } // TODO
      commonWallet.createTransaction({
        value: 90000,
        destinationAddress: 'mghg74ZBppLfhEUmzxK4Cwt1FCqiEtYbXS',
        propagate: false,
        skipSign: true
      }, function (err, transactionHex) {
        if (err) { } // TODO
        t.ok(transactionHex !== null, 'Signed transaction hex is non-null')
        var json = hexParser(transactionHex)
        t.ok(json.vin[0].scriptSig.hex === '', 'the input was not signed')
        t.ok(json.vout[0].value === 90000, 'transaction sends 90000 satoshi')
        t.ok(json.vout[0].scriptPubKey.addresses[0] === 'mghg74ZBppLfhEUmzxK4Cwt1FCqiEtYbXS', 'first output is mghg74ZBppLfhEUmzxK4Cwt1FCqiEtYbXS')
        t.end()
      })
    })
  })
}

module.exports.additionalInfo = function (test, seed, common) {
  test('common wallet instance has an address and a network field', function (t) {
    common.setup(test, function (err, commonWallet) {
      if (err) { } // TODO
      t.ok(commonWallet.address !== null, 'address is not null')
      t.ok(commonWallet.network === 'testnet' || commonWallet.network === 'mainnet', 'network is either testnet or mainnet')
      t.end()
    })
  })
}

module.exports.login = function (test, seed, common) {
  test('common wallet instance can login', function (t) {
    common.setup(test, function (err, commonWallet) {
      if (err) { } // TODO
      var server = app.listen(port, function () {
        commonWallet.login(serverRootUrl, function (err, res, body) {
          if (err) { } // TODO
          var nonce = res.headers['x-common-wallet-nonce']
          t.ok(nonce, 'has nonce')
          server.close()
          t.end()
        })
      })
    })
  })
}

module.exports.requestGet = function (test, seed, common) {
  test('common wallet instance can get request', function (t) {
    t.plan(5)
    var nonce
    var testPath = '/test/requestGet'
    common.setup(test, function (err, commonWallet) {
      if (err) { } // TODO
      app.get(testPath, function (req, res) {
        t.equal(req.headers['x-common-wallet-address'], commonWallet.address, 'has x-common-wallet-address header')
        t.equal(req.headers['x-common-wallet-network'], 'testnet', 'has x-common-wallet-address header')
        commonWallet.signMessage(nonce, function (err, signedNonce) {
          if (err) { } // TODO
          t.equal(req.headers['x-common-wallet-signed-nonce'], signedNonce, 'has x-common-wallet-signed-nonce header')
          res.send('ok')
        })
      })
      var server = app.listen(port, function () {
        commonWallet.login(serverRootUrl, function (err, res, body) {
          if (err) { } // TODO
          nonce = res.headers['x-common-wallet-nonce']
          t.ok(nonce, 'has nonce')
          commonWallet.request({host: serverRootUrl, path: testPath}, function (err, res, body) {
            if (err) { } // TODO
            var verifiedAddress = res.headers['x-common-wallet-verified-address']
            t.equal(verifiedAddress, commonWallet.address, 'verified address')
            server.close()
          })
        })
      })
    })
  })
}

module.exports.requestPost = function (test, seed, common) {
  test('common wallet instance can post request', function (t) {
    var testPath = '/test-post'
    common.setup(test, function (err, commonWallet) {
      if (err) { } // TODO
      app.post(testPath, function (req, res) {
        var value = req.body.key
        res.send(value)
      })
      var server = app.listen(port, function () {
        commonWallet.login(serverRootUrl, function (err, res, body) {
          if (err) { } // TODO
          var value = 'test123'
          commonWallet.request({host: serverRootUrl, path: testPath, method: 'POST', form: { key: value }}, function (err, res, body) {
            if (err) { } // TODO
            t.equal(value, body, 'value was returned')
            server.close()
            t.end()
          })
        })
      })
    })
  })
}

module.exports.all = function (test, seed, common) {
  module.exports.signMessage(test, seed, common)
  module.exports.signTransaction(test, seed, common)
  module.exports.signTransactionInput(test, seed, common)
  module.exports.createTransaction(test, seed, common)
  module.exports.createTransactionSkipSign(test, seed, common)
  module.exports.additionalInfo(test, seed, common)
  module.exports.login(test, seed, common)
  module.exports.requestGet(test, seed, common)
  module.exports.requestPost(test, seed, common)
}
