var config  = require('config.json')()
  , watch   = require('watch')
  , fs      = require('fs')
  , request = require('request')
  , path    = require('path')

var match = false

var dirpath = path.normalize(config.SAVE_GAME_DIRECTORY_PATH)
var filename = path.normalize(config.SAVE_GAME_FILENAME)

//push files to server

var options = {
  ignoreDotFiles: true,
  filter: function (f) {
    if (f === [dirpath, filename].join('/')) {
      match = true
      return true
    }
    return false
  }
}

watch.createMonitor(dirpath, options, function (monitor) {

  if (match) {
    console.log('[INFO]',
      'successfully located save file (',
      filename,
      ')'
    )
    console.log('[INFO]', 'watching for changes...')
  }

  if (!match) {
    console.log('[INFO]',
      'unable to locate save file (',
      filename,
      ')'
    )
  }

  monitor.on('changed', function (f, curr, prev) {

    var filepath = [dirpath, filename].join('/')

    if (curr.size === prev.size) return

    console.log('[INFO]', 'file contents change detected')

    var fileStream = fs.createReadStream(filepath)

    var url = [
      [config.GAME_SERVER_HOST, config.GAME_SERVER_PORT].join(':'),
      config.GAME_SERVER_ENDPOINT
    ].join('/')

    console.log('[INFO]', 'sending file...')

    var stream = fileStream.pipe(request.post(url))
    stream.on('end', function () {
      console.log('[INFO]', 'file transfer complete')
    })

  })
})

//pull latest
setInterval(function () {

  var filepath = [dirpath, filename].join('/')

  // var file = fs.writeFileSync(filepath)

  fs.stat(filepath, function (err, stats) {
    if (err) throw err
    var modified = stats.mtime.getTime()

    var url = [
      [config.GAME_SERVER_HOST, config.GAME_SERVER_PORT].join(':'),
      config.GAME_SERVER_SYNC_ENDPOINT,
      modified
    ].join('/')

    console.log('[INFO]', 'checking server for updates...')
    request.get(url, function (err, res, body) {
      if (err) throw err
      if (res.statusCode === 200) {
        console.log('[INFO]', 'out of date, updating local copy')
        fs.writeFileSync(filepath, body)
        console.log('[INFO]', 'file synced from server')
      }
      else {
        console.log('[INFO]', 'up to date')
      }
    })

  })

}, 10000)
