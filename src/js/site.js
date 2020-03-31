$(document).ready(function () {
    $(window).scroll(function () {
        if ($(this).scrollTop() > 50) {
            $('#back-to-top').fadeIn();
        } else {
            $('#back-to-top').fadeOut();
        }
    });
    // scroll body to 0px on click
    $('#back-to-top').click(function () {
        $('body,html').animate(
            {
                scrollTop: 0,
            },
            400
        );
        return false;
    });

    if ($('#map').length == 0) {
        return;
    }
    var API_BASEURL = 'https://api.coronafriend.test';

    var permaLink = {
        id: undefined
    };

    parsePermaLink();

    // ----------------------------------------------------------------------------
    //
    //  MAP
    //
    // ----------------------------------------------------------------------------
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

    // Roads
    var road_style = {
        color: '#2fb67b',
        weight: 10,
        opacity: 0.65,
    };
    var hilight_style = {
        color: '#0945f3',
        weight: 15,
        opacity: 0.65,
    };

    var road_styles = {
        empty: {
            color: '#F9D8BF',
            weight: 10,
            opacity: 0.65,
        },
        partial: {
            color: '#FFE288',
            weight: 10,
            opacity: 0.65,
        },
        full: {
            color: '#95D1D7',
            weight: 10,
            opacity: 0.65,
        },
        selected: {
            // color: '#F08D88',
            weight: 20,
            opacity: 1.0,
        },
    };

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

    var selected_layer = null;

    var road_layer = L.geoJSON(null, {
        style: function (feature) {
            return getRoadStyle(feature.properties.claim_id);
        },
        onEachFeature: function (feature, layer) {
            layer.on({
                click: function (e) {
                    if (null !== selected_layer) {
                        selected_layer.setStyle(
                            getRoadStyle(e.target.feature.properties.claim_id)
                        );
                    }

                    selected_layer = layer;
                    selected_layer.setStyle(road_styles.selected);

                    toggleStreetInfo();

                    window.location.hash = e.target.feature.id;
                    fillStreetInfo(e.target.feature.properties);
                }
            });
        },
    }).addTo(map);

    // Basemap

    var gl = L.mapboxGL({
        style:
            'https://s3-eu-west-1.amazonaws.com/tiles.os.uk/v2/styles/open-zoomstack-light/style.json',
        accessToken: 'no-token',
    }).addTo(map);

    map.attributionControl.addAttribution(
        '<a href="https://www.ons.gov.uk/">Office for National Statistics</a>, licensed under the <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">Local Government License v3.0</a>. ' +
        'Contains OS data &copy; Crown copyright and database rights 2020'
    );

    // locate control

    var locate_options = {
        setView: true,
        maxZoom: 17,
    };

    var lc = L.control
        .locate({
            position: 'topright',
            icon: 'fas fa-map-marked-alt fa-2x',
            locateOptions: locate_options,
        })
        .addTo(map);

    // map events

    map.on('load', function (e) {
        map.on('movestart', function (e) {
            clearRoads();
        });
        map.on('moveend', function (e) {
            renderRoads();
        });
        map.on('resize', function (e) {
            clearRoads();
            renderRoads();
        });
    });

    renderPermaLink();

    function onLocationFound(e) {
        var radius = e.accuracy;

        L.marker(e.latlng)
            .addTo(map)
            .bindPopup(
                'You seem to be around ' + radius + 'm from this location'
            )
            .openPopup();
        L.circle(e.latlng, radius).addTo(map);
        renderRoads();
    }

    function clearRoads() {
        road_layer.clearLayers();
    }

    function renderRoads(permalink) {
        var zoom = map.getZoom();
        if (zoom < 15) {
            return;
        }
        var bounds = map.getBounds();
        var url =
            API_BASEURL + '/v1/roads?bounds=' +
            bounds.toBBoxString();
        fetch(url)
            .then(function (response) {
                return response.json();
            })
            .then(function (json) {
                road_layer.addData(json);
                if (permalink) {
                    road_layer.eachLayer(function(layer) {
                        if (layer.feature.id == permaLink.id) {
                            layer.fire('click');
                        }
                    });
                }
            })
            .catch(function (ex) {
                console.log('parsing failed', ex);
            });
    }

    map.on('locationfound', onLocationFound);

    // ----------------------------------------------------------------------------
    //
    //  Toogle street infos
    //
    // ----------------------------------------------------------------------------

    function toggleStreetInfo() {
        if ($('#map-wrapper').hasClass('col-md-12')) {
            $('#map-wrapper').removeClass('col-md-12').addClass('col-md-9');
            $('#street-wrapper').removeClass('d-none');
        }

        map.invalidateSize();
        return false;
    }

    // ----------------------------------------------------------------------------
    //
    //  Claim street
    //
    // ----------------------------------------------------------------------------

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

    $('#claim-button').click(function (e) {
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

                road_layer.eachLayer(function(layer) {
                    if (layer.feature.id == json.road_id) {
                        var style = getRoadStyle(json.claim_id);
                        layer.setStyle({
                            color: style.color
                        });
                    }
                });

                switch (json.claim_id) {
                    case 1:
                        // fully claimed
                        $('#claim-type').text('fully claimed');
                        $('#claim-type').addClass('badge badge-full');
                        $('#claim-id-2').prop('disabled', true);
                        break;

                    case 2:
                        // partially claimed
                        $('#claim-type').text('partially claimed');
                        $('#claim-type').addClass('badge badge-partial');
                        break;

                    case 3:
                        // unclaimed
                        $('#claim-type').text('unclaimed');
                        $('#claim-type').addClass('badge badge-empty');
                        break;

                    default:
                        $('#claim-type').addClass('badge');
                        break;
                }
            })
            .catch(function (ex) {
                console.log('PUT failed', ex);
                $('#error-message').text('Road/Street Claim failed');
                $('#errorModal').modal('show');
            });
    });

    // ----------------------------------------------------------------------------
    //
    //  Street info
    //
    // ----------------------------------------------------------------------------

    // "properties": {
    //     "road_id": "f26d3045cdf80022f97b19c86f743369",
    //     "claim_id": 3,
    //     "road_meta": null,
    //     "road_name": "St John Street",
    //     "claim_type": "empty",
    //     "road_number": "B501"
    // },

    function fillStreetInfo(properties) {
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

        // $('#road-name').text(road_name);
        $('#road-number').text(road_number);
        $('#road-meta').val(road_meta);

        $('#claim-id-' + properties.claim_id).prop('checked', true);

        switch (properties.claim_id) {
            case 1:
                // fully claimed
                $('#claim-type').text('fully claimed');
                $('#claim-type').addClass('badge badge-full');
                $('#claim-id-2').prop('disabled', true);
                break;

            case 2:
                // partially claimed
                $('#claim-type').text('partially claimed');
                $('#claim-type').addClass('badge badge-partial');
                break;

            case 3:
                // unclaimed
                $('#claim-type').text('unclaimed');
                $('#claim-type').addClass('badge badge-empty');
                break;

            default:
                $('#claim-type').addClass('badge');
                break;
        }
    }

    // ----------------------------------------------------------------------------
    //
    //  Search Postcode
    //
    // ----------------------------------------------------------------------------

    function searchPostode(postcode) {
        $('#error-message').text('');
        var url =
            API_BASEURL + '/v1/postcode/' +
            encodeURIComponent(postcode);
        fetch(url)
            .then(function (response) {
                return response.json();
            })
            .then(function (json) {
                // check geosjon with features
                if (!json.features) {
                    $('#error-message').text('Postcode not found');
                    $('#errorModal').modal('show');
                    return false;
                }
                //
                var features = json.features;
                if (features && features.length > 1) {
                    // TODO: get bounding box from features
                }
                else {
                    var feature = features[0];
                    var coordinates = feature.geometry.coordinates;
                    map.setView([coordinates[1], coordinates[0]], 17);
                    renderRoads();
                }
            })
            .catch(function (ex) {
                $('#error-message').text('Search postcode failed');
                $('#errorModal').modal('show');
            });
    }

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
        }
    });
    $('#map-postcode-input').keypress(function (e) {
        if (e.which === 13) {
            e.preventDefault();
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
            searchPostode(postcode);
        }
        return false;
    });

    $('#search-postcode').click(function (e) {
        e.preventDefault();
        var postcode = $('#postcode-input').val();
        if (!!postcode) {
            searchPostode(postcode);
        }
        return false;
    });

    // ----------------------------------------------------------------------------
    //
    //  Scroll top
    //
    // ----------------------------------------------------------------------------

    function parsePermaLink() {
        var url = window.location.search.substr(1);
        if (!url) {
            url = window.location.hash.substr(1);
        }

        if (url !== '') {
            permaLink.id = url;
        }
    }

    function renderPermaLink() {
        if (permaLink.id) {
            var url = API_BASEURL + '/v1/roads/' + permaLink.id;
            fetch(url)
                .then(function(response) {
                    return response.json();
                })
                .then(function(json) {
                    var coords = json.geometry.coordinates;
                    var geom = L.GeoJSON.coordsToLatLngs(coords);
                    var line = L.polyline(geom);
                    map.fitBounds(line.getBounds(), {
                        maxZoom: 17
                    });
                    renderRoads(true);
                })
                .catch (function(e) {
                    console.log('permalink fetch failed:', e);
                });
        }
    }
}); // end document ready
