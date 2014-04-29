/**
 JavascriptのみでSPARQLクエリを検索可能なライブラリ
 sgvizler.js より抜粋・改変
 2014.04.14
*/

// from sgvizler.js version 0.6
var sendQuery = function (e,q,f,t) {
	if (typeof f==="undefined") f="json";
	if (typeof t==="undefined") t=f;
    var promise;

    if (window.XDomainRequest) {
        // special query function for IE. Hiding variables in inner function.
        // TODO See: https://gist.github.com/1114981 for inspiration.
        promise = (
			function () {
    			/*global XDomainRequest */
    			var qx = $.Deferred(),
        		xdr = new XDomainRequest(),
        		url = e +
				"?query=" + q +
				"&output=" + t;
    			xdr.open("GET", url);
				xdr.onload = function () {
					var data;
        			if (myEndpointOutput === qfXML) {
						data = $.parseXML(xdr.responseText);
        			} else {
						data = $.parseJSON(xdr.responseText);
        			}
        			qx.resolve(data);
				};
    			xdr.send();
    			return qx.promise();
			}()
        );
    } else {
        promise = $.ajax({
			url: e,
			headers: {
				"Accept": "application/sparql-results+json"
			},
			data: {
				query: q,
				output: f
			},
			dataType: t
        });
    }
    return promise;
}