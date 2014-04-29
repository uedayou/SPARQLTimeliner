# SPARQL Timeliner

[SPARQL Timeliner]は、Open Knowledge Foundation Labs が開発した Timeliner(現TimeMapper)にSPARQLエンドポイント対応を行ったWebアプリです。

- [Timeliner]
- [TimeMapper]

詳しくは、こちらをご覧ください

- [お手軽Linked Open Data可視化ツール SPARQL Timeliner(SlideShare)][ss01]

[SPARQL Timeliner]ではサーバ側で検索結果をキャッシュしていますが、このバージョンはJavascriptで検索結果を逐一取得します。
そのため、PHPやPythonなどのサーバサイド・スクリプトは必要ありません。

## 構成

- /index.html ファイル

SPARQL Timeliner 本体。Javascript・CSSファイルはインターネット上のファイルを指定していますので、このファイルのみで動きます。
通常は以下の「src」フォルダ内のファイルは必要ありません。
次節「使い方」を参考に、titleタグ、SPARQLエンドポイント、クエリを書き換えてください。

- /src フォルダ

SPARQL Timeliner を動かすために必要なJavascript・CSSファイルが含まれています。
JavascriptやCSSをカスタマイズしたい場合は、srcフォルダ以下のファイルを利用してください。


## 使い方

/index.htmlのtitleタグと、エンドポイントのURLとSPARQLクエリに関する設定を変更します。
エンドポイントURLとSPARQLクエリはmetaタグとして以下のように記述します。


    <!-- SPARQLエンドポイント -->
    <meta name="sparql-endpoint" 
    content="http://lodcu.cs.chubu.ac.jp/SparqlEPCU/RDFServer.jsp?reqtype=api&project=toukaido" />
    
    <!-- SPARQLクエリ -->
    <meta name="sparql-query" content="
      PREFIX schema: <http://schema.org/>
      PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX dcterm: <http://purl.org/dc/terms/>
      select distinct ?title ?start ?lat ?long ?description ?image 
      where {
        ?link a <toukaido:浮世絵>;
        rdfs:label ?title;
        dcterm:created ?start;
        schema:image ?image;
        dcterm:description ?description;
        geo:lat ?lat;
        geo:long ?long.
      }
      LIMIT 100
    " />

SPARQLクエリの作成方法については、

- [SPARQL Timelinerサイト 使い方節]
- [SPARQL Timelinerの使い方(SlideShare)][ss02]

を参照してください。

出力フォーマットはJSONのみ対応しています。
もしJSONPを利用する場合は、

    <meta name="sparql-datatype" content="jsonp" />

を追加してください。

あとは任意のWebサーバに全てのファイルを置けば、SPARQL Timelinerアプリが動きます。

Javascript で指定したい場合は、以下のように設定してください。

    var state = {};
    
    // エンドポイントURL
    state.endpoint = "http://lodcu.cs.chubu.ac.jp/SparqlEPCU/RDFServer.jsp?reqtype=api&project=toukaido";
    // SPARQLクエリ
    state.query = "PREFIX schema: <http://schema.org/>PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX dcterm: <http://purl.org/dc/terms/>select distinct ?title ?start ?lat ?long ?description ?image where {?link a <toukaido:浮世絵>;rdfs:label ?title;dcterm:created ?start;schema:image ?image;dcterm:description ?description;geo:lat ?lat;geo:long ?long.}LIMIT 100";
    // jsonフォーマット指定
    state.format = "json";
    // jsonp利用の場合
    // state.type = "jsonp";
    
    createTimeliner(state);

## 対応エンドポイント

以下のエンドポイントでは動作することを確認しています。

- [DBpedia]
- [DBpedia Japanese]
- [LODAC]
- [Sparql EPCU]
- [AITC気象庁XML用API]
- [ヨコハマ・アート・LOD] ※JSONP利用

※これ以外のエンドポイントについては、クロスドメイン制約によりデータを取得できない可能性があります。

## 注意

index.htmlのアクセス毎にエンドポイントへ検索を行いますので、指定したエンドポイントの状態によっては何も表示されないときがあります。また、過度なアクセスはエンドポイントの負荷を高めますので、十分注意してください。

[DBpedia]、[DBpedia Japanese]などの頻繁な更新がないエンドポイントについては、検索結果キャッシュ機能付き[SPARQL Timeliner]の利用をお勧めします。

## ライセンス

Copyright &copy; 2014 Hiroshi Ueda([@uedayou]). Licensed under the [MIT license][mit].

[@uedayou]:https://twitter.com/uedayou
[MIT]: http://www.opensource.org/licenses/mit-license.php
[Timeliner]: https://github.com/okfn/timeliner
[TimeMapper]: https://github.com/okfn/timemapper
[SPARQL Timeliner]: http://uedayou.net/SPARQLTimeliner
[DBpedia]: http://dbpedia.org/
[DBpedia Japanese]: http://ja.dbpedia.org/
[Lodac]: http://lod.ac/
[Sparql EPCU]: http://lodcu.cs.chubu.ac.jp/SparqlEPCU/
[AITC気象庁XML用API]: http://api.aitc.jp/
[ヨコハマ・アート・LOD]: http://fp.yafjp.org/yokohama_art_lod
[SPARQL Timelinerサイト 使い方節]: http://uedayou.net/SPARQLTimeliner/
[ss01]: http://www.slideshare.net/uedayou/linked-open-datasparql-timeliner
[ss02]: http://www.slideshare.net/uedayou/sparql-timeliner-28905905
