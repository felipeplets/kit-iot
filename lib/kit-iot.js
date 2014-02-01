var kit     = require('./kit'),
    request = require('request'),
    io      = require('socket.io'),
    token   = new kit.Token();

//Kit IoT
var KitIoT = function () {
  this.server = new kit.Server({ port: '4000' });
  this.io     = io.listen(this.server.http, { log: false });
  this.token  = token;
};

//Connect
KitIoT.prototype.connect = function () {
  var self = this;

  if (!this.arduino) {
    this.arduino = new kit.Arduino();
    this.button  = new kit.Button({ arduino: this.arduino, pin: 3 });
    this.light   = new kit.Sensor({ arduino: this.arduino, pin: 'A0' });
    this.noise   = new kit.Sensor({ arduino: this.arduino, pin: 'A1' });
    this.dht11   = new kit.Dht11({  arduino: this.arduino, pin: 2 });

    this.button.value = 0;

    //Button
    this.button.on('down', function () {
      self.button.value += 1;
      self.io.sockets.emit('button', self.button.value);

    });

    //Luminosity
    this.light.on('read', function (m) {
      self.light.value = m;
    });

    //Noise
    this.noise.on('read', function (m) {
      self.noise.value = m;
    });

    //Temperature and Humidity
    this.dht11.on('read', function (m) {
      if (m.temperature && m.humidity) {
        self.dht11.temperature = parseFloat(m.temperature);
        self.dht11.humidity    = parseFloat(m.humidity);
      }
    });

    //On arduino error
    this.arduino.on('error', function (e) {
      self.disconnect();
    });

    //On uncaught exception kill process
    process.on('uncaughtException', function (err) {
      console.log(err);
      //self.disconnect();
    });
  }
};

//Start loop to send and save data
KitIoT.prototype.start = function () {
  var self = this;

  self.loop = setInterval(function () {

    var data = self.getSensorValues();

    self.io.sockets.emit('data', data);
    self.saveData(data);

  }, 10000);
};

//Save data to DCA
KitIoT.prototype.saveData = function (data) {
  var self    = this,
      URL     = 'https://api.xively.com/v2/feeds/',
      rawBody = {
        "version":"1.0.0",
         "datastreams" : [ {
            "id": "botao",
            "current_value": data.button
          }, {
            "id": "temperatura",
            "current_value": data.temperature
          }, {
            "id": "umidade",
            "current_value": data.humidity
          }, {
            "id": "liminosidade",
            "current_value": data.light
          }, {
            "id": "ruido",
            "current_value": data.noise
          }
        ]
      },
      feedId  = '706777630';

  console.log(URL + feedId + '.json');
  request({
    method: 'PUT',
    url   : URL + feedId + '.json',
    body  : JSON.stringify(rawBody),
    headers: {
      'X-ApiKey': 'CUdEMROfFjCaPKQuMQTm7mAtcG3Tlw0Fr1QhD2AOJORXob7b'
    }
  }, function (err, res, body) {
    self.button.value = 0;

    if (!err) {
      if (res.statusCode === 200) {
        self.io.sockets.emit('internetConnection', { msg: 'Conectado na nuvem' });
        console.log('Data saved - ' + new Date());

      } else {
        self.io.sockets.emit('no-internetConnection', { msg: 'Erro ao salvar os dados do Kit' });
      }
    }
  });
};

//Clear loop
KitIoT.prototype.clearLoop = function (l) {
  clearInterval(l);
};

//Disconnect
KitIoT.prototype.disconnect = function () {
  this.clearLoop(this.loop);
  this.io.sockets.emit('disconnect');
};

//Logout
KitIoT.prototype.logout = function () {
  this.clearLoop(this.loop);
  this.io.sockets.emit('logout');
};

//Get sensor values
KitIoT.prototype.getSensorValues = function () {
  return {
    button     : this.button.value,
    light      : this.light.value,
    noise      : this.noise.value,
    temperature: this.dht11.temperature,
    humidity   : this.dht11.humidity
  };
};

module.exports = KitIoT;
