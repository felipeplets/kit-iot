var kitiot  = require('./lib/kit-iot'),
    Insight = require('insight'),
    pkg     = require('./package.json'),
    insight = new Insight({
        trackingCode  : 'UA-XXXXXXX-XX',
        packageName   : pkg.name,
        packageVersion: pkg.version
    });

//Initiate the kit
var KitIoT = new kitiot();
insight.track('init');

//On io connection start the arduino
KitIoT.io.on('connection', function (socket) {
  KitIoT.connect();
  insight.track('socket', 'connection');

  //Start sending/saving data
  socket.on('start', function () {
    KitIoT.start();
    insight.track('socket', 'start');
  });

  //Stop sending/saving data
  socket.on('stop', function () {
    KitIoT.clearLoop(KitIoT.loop);
    insight.track('socket', 'stop');
  });
});
