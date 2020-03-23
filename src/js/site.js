var map = L.map('map', {
    minZoom: 7,
    maxZoom: 18,
    scrollWheelZoom: false,
    maxBounds: [[ 49.959999905, -7.57216793459 ], [ 58.6350001085, 1.68153079591]]
});
var road_style = {
    "color": "#2fb67b",
    "weight": 10,
    "opacity": 0.65
};
var hilight_style = {
    "color": "#0945f3",
    "weight": 15,
    "opacity": 0.65
};
var road_layer = L.geoJSON(null, {
    style: function() {
        return road_style;
    },
    onEachFeature: function(feature, layer) {
        layer.on({
            click: function(e) {
                console.log(e.type + ': ' + e.target.feature.id);
                // console.log(e);
            },
            mouseover: function(e) {
                console.log(e.type + ': ' + e.target.feature.id);
                console.log(e);
                layer.setStyle(hilight_style);
            },
            mouseout: function(e) {
                console.log(e.type + ': ' + e.target.feature.id);
                layer.setStyle(road_style);
            }
        })
    }
}).addTo(map);

var gl = L.mapboxGL({
    style: 'https://s3-eu-west-1.amazonaws.com/tiles.os.uk/v2/styles/open-zoomstack-light/style.json',
    accessToken: 'no-token'
}).addTo(map);

map.attributionControl.addAttribution('Contains OS data &copy; Crown copyright and database rights 2018');

locate_options = {
    setView: true,
    maxZoom: 17
};
map.locate(locate_options);
L.control.locate({
    locateOptions: locate_options
}).addTo(map);

map.on('load', function(e) {
    reportUpdate(e);
    // map.on('zoomend', function(e) {
    //     reportUpdate(e);
    // });
    map.on('movestart', function(e) {
        reportUpdate(e);
        clearRoads();
    });
    map.on('moveend', function(e) {
        reportUpdate(e);
        renderRoads();
    });
    map.on('resize', function(e) {
        reportUpdate(e);
        clearRoads();
        renderRoads();
    });
});

function reportUpdate(e) {
    var ctr = map.getCenter();
    var zoom = map.getZoom();
    var bounds = map.getBounds();
    console.log(e.type + ': zoom: ' + zoom + ': ctr: ' + ctr.toString() + ': bounds: ' + bounds.toBBoxString());
}

function onLocationFound(e) {
    console.log('locationFound fired');
    var radius = e.accuracy;

    L.marker(e.latlng).addTo(map)
        .bindPopup("You seem to be around " + radius + "m from this location")
        .openPopup();
    L.circle(e.latlng, radius).addTo(map);
    renderRoads();
    // var bounds = map.getBounds();
    // var url = 'https://api.coronafriend.test/v1/roads?bounds=' + bounds.toBBoxString();
    // fetch(url)
    //     .then((response) => {
    //         return response.json();
    //     })
    //     .then((data) => {
    //         console.log(data);
    //     });

    // fetch(url)
    //     .then (function(response) {
    //         return response.json();
    //     })
    //     .then (function(json) {
    //         console.log('parsed json');
    //         console.log(json);
    //         road_layer.addData(json).setStyle(road_style);
    //     })
    //     .catch(function(ex) {
    //         console.log('parsing failed', ex);
    //     });

    // var api = new CoronaFriend.API();
    // console.log(api);
    // var callbackHandler = {
    //     onSuccess: function(response) {
    //         console.log('callback - onSuccess');
    //         console.log(response);
    //     },
    //     onFailure: function(response) {
    //         console.log('callback - onFailure');
    //     }
    // }
    //
    // var bounds = map.getBounds();
    // api.getRoadsByBoundingBox(bounds.toBBoxString(), callbackHandler);
}

function clearRoads() {
    road_layer.clearLayers();
}

function renderRoads() {
    var zoom = map.getZoom();
    if (zoom < 15) {
        console.log('Zoom ' + zoom + ' - skipping rendering');
        return;
    }
    var bounds = map.getBounds();
    var url = 'https://api.coronafriend.test/v1/roads?bounds=' + bounds.toBBoxString();
    fetch(url)
        .then (function(response) {
            return response.json();
        })
        .then (function(json) {
            // console.log('parsed json');
            // console.log(json);

            // road_layer.addData(json).setStyle(road_style);
            road_layer.addData(json);
        })
        .catch(function(ex) {
            console.log('parsing failed', ex);
        });
}

map.on('locationfound', onLocationFound);