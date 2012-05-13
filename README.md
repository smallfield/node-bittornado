node-bittornado
===============

Web interface for BitTornado made with node.js.


##これは何？
Pythonで書かれたBitTorrentクライアントのBitTornadoを、node.jsによるウェブインタフェースで制御するアプリ。
WebSocketを利用しているので、ほぼリアルタイムにダウンロード状況の把握、および操作が可能。

##使い方
1. git clone git://github.com/smallfield/node-bittornado.git でダウンロード。
2. cloneしたディレクトリへ移動して、node app.js で起動。
3. ブラウザで、http://localhost:3000/にアクセス。
4. TorrentファイルのURLを入力して、[送信]をクリック。
5. ダウンロードが開始されるので、眺めて待つ。