$(document).ready(function () {
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
            color: '#F08D88',
            weight: 15,
            opacity: 1.0,
        },
    };

    function getRoadStyle(claim_type) {
        var style = {};
        switch (claim_type) {
            case 'empty':
                style = road_styles.empty;
                break;
            case 'partial':
                style = road_styles.partial;
                break;
            case 'full':
                style = road_styles.full;
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
            return getRoadStyle(feature.properties.claim_type);
        },
        onEachFeature: function (feature, layer) {
            layer.on({
                click: function (e) {
                    console.log(e.type + ': ' + e.target.feature.id);
                    console.log(e.target.feature);
                    if (null !== selected_layer) {
                        selected_layer.setStyle(
                            getRoadStyle(e.target.feature.properties.claim_type)
                        );
                    }

                    selected_layer = layer;
                    selected_layer.setStyle(road_styles.selected);

                    toggleStreetInfo();

                    fillStreetInfo(e.target.feature.properties);
                    // layer.setStyle(hilight_style);
                    // console.log(e);
                },
                // mouseover: function(e) {
                //     console.log(e.type + ': ' + e.target.feature.id);
                //     console.log(e);
                //     // layer.setStyle(hilight_style);
                // },
                // mouseout: function(e) {
                //     console.log(e.type + ': ' + e.target.feature.id);
                //     // layer.setStyle(road_style);
                // },
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
        'Contains OS data &copy; Crown copyright and database rights 2018'
    );

    // locate control

    var locate_options = {
        setView: true,
        maxZoom: 17,
    };

    // map.locate(locate_options);

    var lc = L.control
        .locate({
            position: 'topright',
            icon: 'fas fa-map-marked-alt fa-2x',
            locateOptions: locate_options,
        })
        .addTo(map);

    // map events

    map.on('load', function (e) {
        reportUpdate(e);
        // map.on('zoomend', function(e) {
        //     reportUpdate(e);
        // });
        map.on('movestart', function (e) {
            reportUpdate(e);
            clearRoads();
        });
        map.on('moveend', function (e) {
            reportUpdate(e);
            renderRoads();
        });
        map.on('resize', function (e) {
            reportUpdate(e);
            clearRoads();
            renderRoads();
        });
    });

    function reportUpdate(e) {
        var ctr = map.getCenter();
        var zoom = map.getZoom();
        var bounds = map.getBounds();
        console.log(
            e.type +
                ': zoom: ' +
                zoom +
                ': ctr: ' +
                ctr.toString() +
                ': bounds: ' +
                bounds.toBBoxString()
        );
    }

    function onLocationFound(e) {
        console.log('locationFound fired');
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

    function renderRoads() {
        var zoom = map.getZoom();
        if (zoom < 15) {
            console.log('Zoom ' + zoom + ' - skipping rendering');
            return;
        }
        var bounds = map.getBounds();
        var url =
            'https://api.coronafriend.com/v1/roads?bounds=' +
            bounds.toBBoxString();
        fetch(url)
            .then(function (response) {
                return response.json();
            })
            .then(function (json) {
                road_layer.addData(json);
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

    function putRoad(road_id, data) {
        var url = 'https://api.coronafriend.com/v1/roads/' + road_id;
        // var url = 'https://httpbin.org/post'; // + road_id;
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
        var road_id = $('#road_id').val();
        var claim_id = $('input[name="claim-id"]:checked').val();
        var road_meta = $('#road-meta').val() + '\n' + user_input;

        return {
            road_id: road_id,
            claim_id: claim_id,
            road_meta: road_meta,
        };
    }

    $('#claim-button').click(function (e) {
        e.preventDefault();
        console.log('claim button clicked');
        // check values
        var user_input = $('#user-meta').val();
        if (!user_input) {
            $('#user-meta-error').removeClass('d-none');
            return;
        }
        $('#error-message').text('');

        console.log(data);
        // submit values
        var data = getFormData(user_input);

        putRoad(road_id, data)
            .then(function (response) {
                return response.json();
            })
            .then(function (json) {
                console.log('POST Road result', json);
                // TODO: refresh street info
                // in the meantime:
                $('#user-meta-error').addClass('d-none');
                $('#form-sucess-feedaback').removeClass('d-none');
            })
            .catch(function (ex) {
                console.log('POST failed', ex);
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

        var road_name = properties.road_name || '';
        var road_number = properties.road_number || '';
        if (road_number) road_number = '(' + road_number + ')';
        var road_meta = properties.road_meta || '';

        $('#road-name').text(road_name);
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
            'https://api.coronafriend.com/v1/postcode/' +
            encodeURIComponent(postcode);
        console.log('fetch url', url);
        fetch(url)
            .then(function (response) {
                console.log('fetch response', response);
                return response.json();
            })
            .then(function (json) {
                console.log('fetch json response', json);
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
                } else {
                    var feature = features[0];
                    var coordinates = feature.geometry.coordinates;
                    map.setView([coordinates[1], coordinates[0]], 17);
                    renderRoads();
                }
            })
            .catch(function (ex) {
                console.log('Search postcode failed', ex);
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
        console.log('search postcode clicked');
        var postcode = $('#map-postcode-input').val();
        if (!!postcode) {
            console.log('postcode', postcode);
            searchPostode(postcode);
        }
        return false;
    });

    $('#search-postcode').click(function (e) {
        e.preventDefault();
        console.log('search postcode (small screen) clicked');
        var postcode = $('#postcode-input').val();
        if (!!postcode) {
            console.log('postcode', postcode);
            searchPostode(postcode);
        }
        return false;
    });

    // ----------------------------------------------------------------------------
    //
    //  About button click
    //
    // ----------------------------------------------------------------------------

    $('#about-btn').click(function () {
        $('#aboutModal').modal('show');
        $('.navbar-collapse').collapse('hide');
        return false;
    });

    // ----------------------------------------------------------------------------
    //
    //  Scroll top
    //
    // ----------------------------------------------------------------------------

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
}); // end document ready
