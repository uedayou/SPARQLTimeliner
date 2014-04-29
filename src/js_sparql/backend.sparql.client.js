/**
Backend.sparql.client.js

Copyright (c) 2014 Hiroshi Ueda(uedayou.net)

This software is released under the MIT License.
*/

var recline = recline || {};
recline.Backend = recline.Backend || {};
recline.Backend.GDocs = recline.Backend.GDocs || {};

// note module is *defined* in qunit tests :-(
if (typeof module !== 'undefined' && module != null && typeof require !== 'undefined') {
	var _ = require('underscore');
	module.exports = recline;
}

(function(my) {
	my.__type__ = 'gdocs';

	var Deferred = _.isUndefined(this.jQuery) ? _.Deferred : jQuery.Deferred;

	// Fetch data from a Google Docs spreadsheet.
	//
	// For details of config options and returned values see the README in
	// the repo at https://github.com/Recline/backend.gdocs/
	my.fetch = function(config) {
		var dfd  = new Deferred();
		qr = sendQuery(config.endpoint,config.query,config.format,config.type);
		qr.fail(
			function (xhr, textStatus, thrownError) {
				alert("Error: A '" + textStatus+ "' occurred.");
			}
		);
		qr.done(
			function (d) {
				var result = my.parseSparql(d);

				var title = "Visualize Map & Timeline";
				if ("title" in d) title = d.title;

				var fields = _.map(result.fields, function(fieldId) {
					return {id: fieldId};
				});

				var metadata = {
					title: title,
					spreadsheetTitle: title,
					worksheetTitle  : title,
				};

				dfd.resolve({
					metadata: metadata,
					records: result.records,
					fields: fields,
					useMemoryStore: true
				});
			}
		);
		
		return dfd.promise();
	};

	// ## parseData -> parseSparql
	//
	// Parse data from Sparql Endpoint into a reasonable form
	//
	// :options: (optional) optional argument dictionary:
	// columnsToUse: list of columns to use (specified by field names)
	// colTypes: dictionary (with column names as keys) specifying types (e.g. range, percent for use in conversion).
	// :return: tabular data object (hash with keys: field and data).
	// 
	// Issues: seems google docs return columns in rows in random order and not even sure whether consistent across rows.
	my.parseSparql = function(sparql, options) {

		var options  = options || {};
		var colTypes = options.colTypes || {};
		var results = {
			fields : [],
			records: []
		};
		var heads = sparql.head.vars || [];
		var entries = sparql.results.bindings || [];
		var key;
		var colName;
		// percentage values (e.g. 23.3%)
		var rep = /^([\d\.\-]+)\%$/;

		for(var i=0;i<heads.length;i++) {
			results.fields.push(heads[i]);
		}

		results.fields.push("location");
		results.fields.push("locationoriginal");

		results.records = _.map(entries, function(entry) {
			var row = {};
			var location = {"lat":0, "long":0};
			var latns = 1;
			var longew = 1;

			_.each(results.fields, function(col) {
				var _keyname = col;
//				var value = _keyname in entry ? entry[_keyname].value : "";
				var value = ""; var type = "";
				if (_keyname in entry) {
					value = entry[_keyname].value;
					type = entry[_keyname].type;
				}
				var num;

				if (col==="lat" || col==="long") {
					location[col]=value;
				}
				else if (col==="start" || col==="end") {
//					row[col] = value;
					value = my.checkDate(value, type);
					if (value) row[col] = value;
				}
				else if (col==="latns") if ("lat" in entry);else latns = value==="S" ? -1 : 1;
				else if (col==="latd") if ("lat" in entry);else location["lat"] += parseFloat(value);
				else if (col==="latm") if ("lat" in entry);else location["lat"] += parseFloat(value)/60;
				else if (col==="lats") if ("lat" in entry);else location["lat"] += parseFloat(value)/60/60;
				else if (col==="longew" ) if ("long" in entry);else longew = value==="W" ? -1 : 1;
				else if (col==="longd" ) if ("long" in entry);else location["long"] += parseFloat(value);
				else if (col==="longm" ) if ("long" in entry);else location["long"] += parseFloat(value)/60;
				else if (col==="longs" ) if ("long" in entry);else location["long"] += parseFloat(value)/60/60;
				else if (col==="image" ) row["media"] = value;
				else if (col==="caption" ) row["mediacaption"] = value;
				else if (col==="credit" ) row["mediacredit"] = value;
				else if (col==="webpage" ) row["url"] = value;
				else row[col] = value;

			});

			var lat = location["lat"]*latns;
			var lng = location["long"]*longew;
			var tmp = "";
			if (lat!==0&&lng!==0) {
				tmp = "\""+(location["lat"]*latns)+","+(location["long"]*longew)+"\"";
			}
			row["location"] = tmp;
			row["locationoriginal"] = tmp;

			if ("start" in row) return row;
		}).filter(function(entry) {return entry;});

		results.worksheetTitle = "Visualize Map & Timeline";
		return results;
	};

	my.checkDate = function (value, type) {
		
		var result;
		// Date.parseでチェック
		var check = Date.parse(value);
		if (!isNaN(check)) {
			result=value.match("^([0-9]{4})[-\/]([0-9]{2})[-\/]([0-9]{2})$");
			if ( result ) {
				return my.getYMD(result[1],Number(result[2]),result[3]);
			}
			result=value.match("^([0-9]{4})[-\/]([0-9]{2})$");
			if ( result ) {
				return my.getYMD(result[1],Number(result[2]),1);
			}
			return value;
		}
		
		type = type || "";
		if (type.match("http://www.w3.org/2001/XMLSchema#dateTime"))
			return value;
		result=value.match("([0-9]{3,4})年([0-9]{1,2})月([0-9]{1,2})日");
		if ( result ) {
			return my.getYMD(result[1],result[2],result[3]);
		}
		result=value.match("([0-9]{3,4})年([0-9]{1,2})月");
		if ( result ) {
			return my.getYMD(result[1],result[2],1);
		}
		result=value.match("[0-9]{3,4}");
		if ( result ) return result;
		else return null;
	};
	
	my.getYMD = function(y,m,d) {
		m=Number(m)<10?'0'+m:m;
		d=Number(d)<10?'0'+d:d;
		return y+"-"+m+"-"+d;
	}
}(recline.Backend.GDocs));

