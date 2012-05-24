/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var crypto = require('crypto');  

var spawn = require('child_process').spawn;

var downs = {};
var sockets = {};

var wait = 1000;
var lastsend = 0;

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// socket IO
var io = require('socket.io').listen(app);

io.sockets.on('connection', function(socket) {
  sockets[socket.id] = socket;
  socket.emit('reload',  JSON.stringify(downs));
  socket.on('disconect', function(){
    delete sockets[socket.id];
  });
});


// download methods 
addDown = function(url) {
  proc = spawn('python', [__dirname + '/lib/bittornado/btdownloadheadless.py', '--url', url], {
    cwd : process.cwd()
  });
  proc.stdout.setEncoding('utf8');
  var down = new Object();
  down.url = url;
  down.startedAt = new Date().toString();
  down.percent = '0.0';
  var key = crypto.createHash('sha1').update(url).digest(encoding='hex');  
  downs[key] = down;
  downs[key].downrate="-";
  downs[key].uprate="-";
  downs[key].timeleft="-";
  downs[key].name="";
  downs[key].kill=false;


  // 新しいデータをブロードキャスト
  sendData('reload', JSON.stringify(downs), true);

  proc.stdout.on('data', function(data){
    // 名称取得
    if(/^saving: +(.*)/m.test(data)){
      downs[key].name = RegExp.$1;
    }

    // download rateを取得
    if(/.*download rate: +([ 0-9kB/m\.]+s)/m.test(data)){
      downs[key].downrate = RegExp.$1;
    }

    // time leftを取得
    if(/.*upload rate: +([ 0-9kB/m\.]+s)/m.test(data)){    
      downs[key].uprate = RegExp.$1;
    }

    // time leftを取得
    if(/.*time left: +([0-9][ 0-9minsechour]+)/m.test(data)){
      downs[key].timeleft = RegExp.$1;
    }
    // percent doneを取得
    if(/.*percent done: +([\.\d]+)/m.test(data)){
      downs[key].percent = RegExp.$1;
      if(RegExp.$1 == "100" && downs[key].timeleft != "") {
        proc.kill('SIGKILL');
        downs[key].downrate="-";
        downs[key].uprate="-";
        downs[key].timeleft="-";
        console.log("Download end. Process has killed.");
      }
    }

    // 終了割り込み処理
    if(downs[key].kill) {
      proc.kill('SIGKILL');
      delete downs[key];
      sendData('reload', JSON.stringify(downs), true);      
    }

    // 新しいデータをブロードキャスト
    sendData('reload', JSON.stringify(downs), false);

  });

  proc.on('exit', function(){
    if(downs[key] && downs[key].percent && downs[key].percent != 100) {
      sendData('error', JSON.stringify({message:'ダウンロードプロセスが強制終了されました。' }));
      delete downs[key];
    }
  });
}

sendData = function(type, content, force){
  if (new Date().getTime() - lastsend > wait || force) {
    for (var n in sockets){
      sockets[n].emit(type, content);
    }
    lastsend = new Date().getTime();
  }

}


// Routes
app.get('/', routes.index);
app.post('/add', function(req, res){
  var url = req.param('url');
  addDown(url);
  res.render('index', {
    title: 'node-bittornado',
    url: url
  });
});

app.get('/add', function(req, res){
  var url = req.param('url');
  addDown(url);
  res.render('index', {
    title: 'node-bittornado',
    url: url
  });
});

app.get('/del', function(req, res){
  var key = req.param('key');
  if(downs[key]) {
    downs[key].kill = true;
  }
});

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
