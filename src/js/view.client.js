"use strict";

(function () {
  jQuery(function($) {
    var state = recline.View.parseQueryString(decodeURIComponent(window.location.search));
    if (state) {
      _.each(state, function(value, key) {
        state[key] = value;
      });
    }
    if (state.embed !== undefined) {
      $('body').addClass('embed');
    }
  });
})();

var createTimeliner = function(state) {
　if (typeof state === "undefined" || !Object.keys(state).length) {
    state = {};
    state.endpoint = $("meta[name=sparql-endpoint]").attr("content");
    state.query = $("meta[name=sparql-query]").attr("content");
    state.format = $("meta[name=sparql-format]").attr("content")?$("meta[name=sparql-format]").attr("content"):"json";
    state.type = $("meta[name=sparql-datatype]").attr("content")?$("meta[name=sparql-datatype]").attr("content"):state.format;
    state.clustering = ($("meta[name=poi-clustering]").attr("content") === 'true');
  }
  
  state.backend = 'gdocs';
  if (state.embed !== undefined) {
    $('body').addClass('embed');
  }
  var dataset = new recline.Model.Dataset(state);
  
  // クラスタリング設定
  var f=false;
  if ("clustering" in state) f=state.clustering.length==0?false:state.clustering;
  dataset.set({markercluster:f});
  
  $('.navbar .brand').text(document.title);
  
  var timeliner = new TimelinerView({
    model: dataset,
    el: $('.data-views')
  });
  timeliner.render();

  $('.js-embed').on('click', function(e) {
    e.preventDefault();
    var url = window.location.href.replace(/#.*$/, "") + '?embed=1'; // for now, just remove any fragment id
    var val = '<iframe src="' + url + '" frameborder="0" style="border: none;" width="100%" height="780;"></iframe>';
    $('.embed-modal textarea').val(val);
    $('.embed-modal').modal();  
  });
};

var TimelinerView = Backbone.View.extend({
  events: {
    'click .controls .js-show-toolbox': '_onShowToolbox',
    'submit .toolbox form': '_onSearch'
  },

  _onShowToolbox: function(e) {
    e.preventDefault();
    if (this.$el.find('.toolbox').hasClass('hideme')) {
      this.$el.find('.toolbox').removeClass('hideme');
    } else {
      this.$el.find('.toolbox').addClass('hideme');
    }
  },

  _onSearch: function(e) {
    e.preventDefault();
    var query = this.$el.find('.text-query input').val();
    this.model.query({q: query});
  },

  render: function() {
    var self = this;
    // explicitly set width as otherwise Timeline does extends a bit too far (seems to use window width rather than width of actual div)
    // $el.width((this.el.width() - 45)/2.0);
    
    this._setupTimeline = function() {
      this.timeline = new recline.View.Timeline({
        model: this.model,
        el: this.$el.find('.timeline'),
        state: {
          timelineJSOptions: {
            "hash_bookmark": true
          }
        }
      });

      // Timeline will sort the entries by timestamp, and we need the order to be
      // the same for the map which runs off the model
      this.model.records.comparator = function (a, b) {
        // VMM.Date.parse is the timelinejs date parser
        var a = VMM.Date.parse(self.timeline._parseDate(a.get("start")));
        var b = VMM.Date.parse(self.timeline._parseDate(b.get("start")));
        return a - b;
      };

      this.timeline.convertRecord = function(record, fields) {
        if (record.attributes.start[0] == "'") {
          record.attributes.start = record.attributes.start.slice(1);
        }
        if (record.attributes.end && record.attributes.end[0] == "'") {
          record.attributes.end = record.attributes.end.slice(1);
        }
        try {
          var out = this._convertRecord(record, fields);
        } catch (e) {
          out = null;
        }
        if (!out) {
          if (typeof console !== "undefined" && console.warn) console.warn('Failed to extract date from: ' + JSON.stringify(record.toJSON()));
          return null;
        }

        // TimeMapper codes add on 2013.12.10
        if (record.get('media')) {
          out.asset = {
            media: record.get('media'),
            caption: record.get('mediacaption'),
            credit: record.get('mediacredit'),
            thumbnail: record.get('icon')
          };
        }
        out.headline = record.get('title');
        if (record.get('url')) {
          out.headline = '<a href="%url" class="title-link" title="%url">%headline <i class="fa fa-external-link title-link"></i></a>'
            .replace(/%url/g, record.get('url'))
            .replace(/%headline/g, out.headline)
            ;
        }
        // TimeMapper codes 2013.12.10

        out.text = record.get('description');
        if (record.get('source')) {
          var s = record.get('source');
          if (record.get('sourceurl')) {
            s = '<a href="' + record.get('sourceurl') + '">' + s + '</a>';
          }
          out.text += '<p class="source">Source: ' + s + '</p>';
        }
        return out;
      };
      this.model.records.sort();
      this.timeline.render();
    };

    this._setupMap = function() {
      this.map = new recline.View.Map({
        model: this.model
        // マーカークラスタリング対応
        ,state:{cluster: this.model.get("markercluster")}
      });
      this.$el.find('.map').append(this.map.el);

      // マーカークラスタリング対応
      this.map._clusterOptions = {
        zoomToBoundsOnClick: true,
        maxClusterRadius: 60,
        singleMarkerMode: false,
        skipDuplicateAddTesting: false,
        animateAddingMarkers: false
      };

      // customize with icon column
      this.map.infobox = function(record) {
        if (record.icon !== undefined) {
          return '<img src="' + record.get('icon') + '" width="100px"> ' +record.get('title');
        }
        return record.get('title');
      };

      this.map.geoJsonLayerOptions.pointToLayer = function(feature, latlng) {
        var marker = this.model.get("markercluster")
        	? new L.Marker(latlng)
        	: new L.Marker(latlng, {opacity: 0.4+0.5*Math.random()});
        
        var record = this.model.records.get(feature.properties.cid);
        var recordAttr = record.toJSON();
        
        // TimeMapper
        var label = recordAttr.title + '<br />Date: ' + recordAttr.start;
        if (recordAttr.size) {
          label += '<br />Size: ' + recordAttr.size;
        }
        marker.bindLabel(label);

        // customize with icon column
        if (recordAttr.icon !== undefined) {
          var eventIcon = L.icon({
            iconUrl:recordAttr.icon,
            iconSize:     [40, 40],
            iconAnchor:   [30, 40],
            shadowAnchor: [-10, -40],
            popupAnchor:  [-10, -40]
          });
          marker.setIcon(eventIcon);
        }

        // this is for cluster case
        this.markers.addLayer(marker);

        // When a marker is clicked, update the fragment id, which will in turn update the timeline
        marker.on("click", function (e) {
          var i = _.indexOf(record.collection.models, record);
          window.location.hash = "#" + i.toString();
        });

        // Stored so that we can get from record to marker in hashchange callback
        record.marker = marker;

        return marker;
      };
      this.map.render();
    };

    // load the data
    this.model.fetch()
      .done(function() {
        // http://reclinejs.com/docs/tutorial-basics.html
        // 全ての結果を表示(default:100)
        self.model.query({size: self.model.recordCount});
        
        // We postpone rendering until now, because otherwise timeline might try to navigate to a non-existent marker
        $('.js-loading').hide();
        self._setupMap();
        self._setupTimeline();
        
        // Nasty hack. Timeline ignores hashchange events unless is_moving == True. However, once it's True, it can never
        // become false again. The callback associated with the UPDATE event sets it to True, but is otherwise a no-op.
        $("div.slider").trigger("UPDATE");

//        var title = self.model.get('spreadsheetTitle');
//        $('.navbar .brand').text(title);
//		document.title = title + ' - SPARQL Timeliner';

        // set up twitter share button
        // do this here rather than in page so it picks up title correctly
        !function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src="//platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");
      });

    $(window).on("hashchange", function () {
      var hash = window.location.hash.substring(1);
      // なぜか Firefoxで 0 を弾くので直接指定
      if (hash==='0'|| parseInt(hash, 10)) {
        var record = self.model.records.at(hash);
        if (record && record.marker) {
        // マーカークラスタリング対応
        // クラスタを全て展開する。
        // https://github.com/Leaflet/Leaflet.markercluster/issues/72
		if (self.map.markers) {
			self.map.markers.zoomToShowLayer(record.marker, function() {
				record.marker.openPopup();
			});
		}
		else
          record.marker.openPopup();
        }
      }
    });
  }
});
