var API_BASEURL = 'https://api.coronafriend.com';
var state = {
    map: null,
    layers: null,
    active_road: null,
    permalink: null
};

var road_styles = {
    empty: {
        color: '#F9D8BF',
        weight: 10,
        opacity: 0.75,
    },
    partial: {
        color: '#FFE288',
        weight: 10,
        opacity: 0.75,
    },
    full: {
        color: '#BAEB90',
        weight: 10,
        opacity: 0.75,
    },
    selected: {
        color: '#70B5E5',
        weight: 20,
        opacity: 1.0,
    },
};

function initMap() {
    var map = L.map('map', {
        minZoom: 7,
        maxZoom: 18,
        scrollWheelZoom: false,
        maxBounds: [
            [49.959999905, -7.57216793459],
            [58.6350001085, 1.68153079591],
        ],
    });

    map.setView([-0.118092, 51.509865], 7);

    var gl = L.mapboxGL({
        style:
            'https://s3-eu-west-1.amazonaws.com/tiles.os.uk/v2/styles/open-zoomstack-light/style.json',
        accessToken: 'no-token',
    }).addTo(map);

    map.attributionControl.addAttribution(
        '<a href="https://www.ons.gov.uk/">Office for National Statistics</a>, licensed under the <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">Local Government License v3.0</a>. ' +
        'Contains OS data &copy; Crown copyright and database rights 2020'
    );

    var locate_options = {
        setView: true,
        maxZoom: 17,
    };

    var lc = L.control.locate({
        position: 'topright',
        icon: 'fas fa-map-marked-alt fa-2x',
        locateOptions: locate_options,
    }).addTo(map);

    return map;
}

function getRoadStyle(claim_id) {
    var style = {};
    switch (claim_id) {
        case 1:
            style = road_styles.full;
            break;
        case 2:
            style = road_styles.partial;
            break;
        case 3:
            style = road_styles.empty;
            break;
        default:
            style = road_styles.empty;
            break;
    }
    return style;
}

function renderRoads() {
    // console.log('renderRoads');
    var zoom = state.map.getZoom();
    if (zoom < 15) {
        return;
    }
    var bounds = state.map.getBounds();
    var url = API_BASEURL + '/v1/roads?bounds=' + bounds.toBBoxString();
    fetch(url)
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {
            state.layers.addData(json);
            if (state.active_road !== null) {
                selectRoad(state.active_road);
            }
            if (state.permalink !== null) {
                layer = findLayerById(state.permalink);
                displayRoadInfo(layer.feature.properties);
                showInfoPanel();

            }
        })
        .catch(function (ex) {
            console.log('parsing failed', ex);
        });
}

function clearRoads() {
    // console.log('clearRoads');
    state.layers.clearLayers();
}

function findLayerById(id) {
    var road_layer = null;
    state.layers.eachLayer(function(layer) {
        if (layer.feature.id == id && road_layer == null) {
            road_layer = layer;
        }
    });

    return road_layer;
}

function selectRoad(id) {
    // console.log('selectRoad: ' + id);
    var layer = findLayerById(id);

    if (layer !== null) {
        layer.setStyle(road_styles.selected);
    }
}

function deselectRoad(id) {
    // console.log('deselectRoad: ' + id);
    var layer = findLayerById(id);

    if (layer !== null) {
        layer.setStyle(getRoadStyle(layer.feature.properties.claim_id));
    }
}

function searchPostcode(postcode) {
    $('#error-message').text('');
    var url = API_BASEURL + '/v1/postcode/' + encodeURIComponent(postcode);
    fetch(url)
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {
            // check geosjon with features
            if (!json.features) {
                $('#error-message').text('Oh no! Sorry but that postcode couldn\'t be found');
                $('#errorModal').modal('show');
                return false;
            }

            var features = json.features;
            if (features && features.length > 1) {
                // TODO: get bounding box from features
            }
            else {
                var feature = features[0];
                var coordinates = feature.geometry.coordinates;
                state.map.setView([coordinates[1], coordinates[0]], 17);
                renderRoads();
            }
        })
        .catch(function (ex) {
            $('#error-message').text('On no! Postcode search failed');
            $('#errorModal').modal('show');
        });
}

function showInfoPanel() {
    // console.log('showInfoPanel');
    if ($('#map-wrapper').hasClass('col-md-12')) {
        $('#map-wrapper').removeClass('col-md-12').addClass('col-md-9');
        $('#street-wrapper').removeClass('d-none');
        // console.log('showInfoPanel: invalidating map');
        state.map.invalidateSize();
    }
    else {
        // console.log('showInfoPanel: panel already visible');
        if (state.active_road !== null) {
            // console.log('showInfoPanel: setting active road ' + state.active_road);
            selectRoad(state.active_road);
        }
    }
}

function displayRoadInfo(properties) {
    // console.log('displayRoadInfo: ' + properties.road_id);
    $('#road-id').val(properties.road_id);
    $('#claim-type').removeAttr('class');
    $('#user-meta-error').addClass('d-none');
    $('#form-sucess-feedaback').addClass('d-none');

    var road_name = properties.road_name || '(unnamed road)';
    var road_number = properties.road_number || '';
    if (road_number) road_number = '(' + road_number + ')';

    var road_meta = '';
    if (properties.road_meta) {
        road_meta = properties.road_meta.join('\n');
    }

    var link = $('<a>');
    link.attr('href', window.location.href);
    link.text(road_name);
    $('#road-name').html(link);
    $('#road-number').text(road_number);
    $('#road-meta').val(road_meta);

    $('#claim-id-' + properties.claim_id).prop('checked', true);

    switch (properties.claim_id) {
        case 1:
            // fully claimed
            $('#claim-type').text('Fully Covered');
            $('#claim-type').addClass('badge badge-full');
            $('#claim-id-2').prop('disabled', true);
            break;

        case 2:
            // partially claimed
            $('#claim-type').text('Partly Covered');
            $('#claim-type').addClass('badge badge-partial');
            break;

        case 3:
            // unclaimed
            $('#claim-type').text('Help Needed');
            $('#claim-type').addClass('badge badge-empty');
            break;

        default:
            $('#claim-type').addClass('badge');
            break;
    }
}

function putRoad(data) {
    var url = API_BASEURL + '/v1/roads/' + data.road_id;
    return fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        redirect: 'follow',
        body: JSON.stringify(data),
    });
}

function getFormData(user_input) {
    var road_id = $('#road-id').val();
    var claim_id = $('input[name="claim-id"]:checked').val();

    var meta = [];
    var sanitised_input = user_input.replace(/(<([^>]+)>)/ig,"");
    meta.push(sanitised_input);

    return {
        road_id: road_id,
        claim_id: claim_id,
        road_meta: meta
    };
}

function getPermaLink() {
    // console.log('getPermaLink');
    var url = window.location.search.substr(1);
    if (!url) {
        url = window.location.hash.substr(1);
    }
    if (url !== '') {
        state.permalink = url;
        // console.log('getPermaLink: set id: ' + state.permalink);
    }
}

function renderPermaLink() {
    // console.log('renderPermaLink');
    if (state.permalink !== null) {
        // console.log('renderPermaLink: ' + state.permalink);
        var url = API_BASEURL + '/v1/roads/' + state.permalink;
        fetch(url)
            .then(function(response) {
                return response.json();
            })
            .then(function(json) {
                // console.log('renderPermaLink: got street info');
                var coords = json.geometry.coordinates;
                var geom = L.GeoJSON.coordsToLatLngs(coords);
                var line = L.polyline(geom);
                state.active_road = state.permalink;

                state.map.fitBounds(line.getBounds(), {
                    maxZoom: 17
                });
            })
            .catch (function(e) {
                console.log('permalink fetch failed:', e);
            });
    }
}

function initScrollHandlers() {
    $(window).scroll(function () {
        if ($(this).scrollTop() > 50) {
            $('#back-to-top').fadeIn();
        }
        else {
            $('#back-to-top').fadeOut();
        }
    });

    $('#back-to-top').click(function () {
        $('body,html').animate({
                scrollTop: 0,
            }, 400
        );
        return false;
    });
}

$(document).ready(function () {
    initScrollHandlers();
    getPermaLink();

    if ($('#map').length == 0) {
        return;
    }

    state.map = initMap();

    var selected_layer = null;

    state.layers = L.geoJSON(null, {
        style: function (feature) {
            return getRoadStyle(feature.properties.claim_id);
        },
        onEachFeature: function (feature, layer) {
            layer.on({
                click: function (e) {
                    // console.log('road click fired');
                    // console.log(layer);

                    if (null !== state.active_road) {
                        deselectRoad(state.active_road);
                        state.active_road = null;
                    }

                    state.active_road = e.target.feature.id;
                    window.location.hash = state.permalink = e.target.feature.id;
                    displayRoadInfo(e.target.feature.properties);
                    showInfoPanel();
                }
            });
        },
    }).addTo(state.map);

    state.map.on('movestart', function (e) {
        // console.log('movestart fired');
        clearRoads();
    });
    state.map.on('moveend', function (e) {
        // console.log('moveend fired');
        renderRoads();
    });
    state.map.on('resize', function (e) {
        // console.log('resize fired');
        clearRoads();
        renderRoads();
    });
    state.map.on('locationfound', function(e) {
        var radius = e.accuracy;
        L.marker(e.latlng)
            .addTo(state.map)
            .bindPopup('You seem to be around ' + radius + 'm from this location')
            .openPopup();
    });

    renderPermaLink();

    $('#claim-button').click(function (e) {
        // console.log('#claim-button click fired');
        e.preventDefault();
        $('#form-sucess-feedaback').addClass('d-none');
        // check values
        var user_input = $('#user-meta').val();
        if (!user_input) {
            $('#user-meta-error').removeClass('d-none');
            return;
        }
        $('#error-message').text('');

        // submit values
        var data = getFormData(user_input);
        putRoad(data)
            .then(function (response) {
                return response.json();
            })
            .then(function (json) {
                $('#user-meta-error').addClass('d-none');
                $('#form-success-feedback').removeClass('d-none');

                if (json.road_meta) {
                    var road_meta = json.road_meta.join('\n');
                    $('#road-meta').val(road_meta);
                }

                $('#user-meta').text('');
                $('#claim-id-' + json.claim_id).prop('checked', true);

                // console.log('API updated OK');
                clearRoads();
                renderRoads();

                switch (json.claim_id) {
                    case 1:
                        // fully claimed
                        $('#claim-type').text('Fully Covered');
                        $('#claim-type').addClass('badge badge-full');
                        $('#claim-id-2').prop('disabled', true);
                        break;

                    case 2:
                        // partially claimed
                        $('#claim-type').text('Partly Covered');
                        $('#claim-type').addClass('badge badge-partial');
                        break;

                    case 3:
                        // unclaimed
                        $('#claim-type').text('Help Needed');
                        $('#claim-type').addClass('badge badge-empty');
                        break;

                    default:
                        $('#claim-type').addClass('badge');
                        break;
                }
            })
            .catch(function (ex) {
                // console.log('PUT failed', ex);
                $('#error-message').text('Oh no! Sorry but that update didn\'t work. Try refreshing your browser and trying again');
                $('#errorModal').modal('show');
            });
    });


    // Highlight search box text on click
    $('#postcode-input').click(function () {
        $(this).select();
    });
    $('#map-postcode-input').click(function () {
        $(this).select();
    });

    // Prevent hitting enter from refreshing the page
    $('#postcode-input').keypress(function (e) {
        if (e.which === 13) {
            e.preventDefault();
            $('#search-postcode').trigger('click');
        }
    });
    $('#map-postcode-input').keypress(function (e) {
        if (e.which === 13) {
            e.preventDefault();
            $('#map-search-postcode').trigger('click');
        }
    });
    // Prevent duble click on input text which is interpreted as a zoom-in
    $('#map-postcode-input').dblclick(function (e) {
        e.stopPropagation();
    });

    $('#map-search-postcode').click(function (e) {
        e.preventDefault();
        var postcode = $('#map-postcode-input').val();
        if (!!postcode) {
            searchPostcode(postcode);
        }
        return false;
    });

    $('#search-postcode').click(function (e) {
        e.preventDefault();
        var postcode = $('#postcode-input').val();
        if (!!postcode) {
            searchPostcode(postcode);
        }
        return false;
    });

    $('#help-permalink').click(function(e) {
        e.preventDefault();
        $('#modal-permalink').modal('show');
    });
    $('#help-help-needed').click(function(e) {
        e.preventDefault();
        $('#modal-help-needed').modal('show');
    });
    $('#help-partly-covered').click(function(e) {
        e.preventDefault();
        $('#modal-partly-covered').modal('show');
    });
    $('#help-fully-covered').click(function(e) {
        e.preventDefault();
        $('#modal-fully-covered').modal('show');
    });
    $('#help-update').click(function(e) {
        e.preventDefault();
        $('#modal-update').modal('show');
    });

});
