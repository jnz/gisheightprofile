/**
 * Copyright (c) 2008-2009 The Open Source Geospatial Foundation
 *
 * Published under the BSD license.
 * See http://svn.geoext.org/core/trunk/geoext/license.txt for the full text
 * of the license.
 */
/** api: (define)
 *  module = GeoExt.ux
 *  class = ElevationProfileTool
 *  base_link = `Ext.Button <http://dev.sencha.com/deploy/dev/docs/?class=Ext.Button>`_
 */

var PROFILE_DIR_PREFIX = "";

Ext.namespace("GeoExt.ux");

//variable holds map object
var globalMap = null;

// Height Provider:
// - "google" (default)     http://code.google.com/intl/en-EN/apis/maps/documentation/javascript/
// - "mapquest"             http://developer.mapquest.com/web/products/open/elevation-service
var heightProvider;

// When drawing the geodetic line, every GEODETIC_LINE_SMOOTHERth point is used.
// GEODETIC_LINE_SMOOTHER = 1 would be a very smooth curve (but slow in drawing).
// GEODETIC_LINE_SMOOTHER = 20 would be a edged curve (but fast in drawing).
var GEODETIC_LINE_SMOOTHER = 15;

//create ElevationProfileTool as GeoExt-ux-extension
GeoExt.ux.ElevationProfileTool = Ext.extend(Ext.Button, {
    //properties of ElevationProfileTool
    map: null,
    //OpenLayers map
    profileControl: null,
    //profileControl
    heighProvider: 'google',
    //height provider for elevation service
    enableToggle: true,
    customLanguage: 'en',
    //icon for button
    toggleGroup: "measure controls",
    toggleHandler: function (item, pressed) { //handler for click on button
        clearAllMarkers();
        if (pressed) {
            this.profileControl.activate();
        } else {
            this.profileControl.deactivate();
        }
    },

    /** private: constructor
     */
    initComponent: function () {
        // Init i18n settings
        setLocale(this.customLanguage);

        GeoExt.ux.ElevationProfileTool.superclass.initComponent.apply(this, arguments);

        //set global variables
        globalMap = this.map;
        heightProvider = this.heightProvider;

        // Marker layer
        var markerLayer = new OpenLayers.Layer.Markers("Markers", {
            displayInLayerSwitcher: false
        });
        this.map.addLayer(markerLayer);

        // Profile line layer
        var renderer = OpenLayers.Util.getParameters(window.location.href).renderer;
        renderer = (renderer) ? [renderer] : OpenLayers.Layer.Vector.prototype.renderers;
        var layer_style = OpenLayers.Util.extend({}, OpenLayers.Feature.Vector.style['default']);
        layer_style.fillOpacity = 0.2;
        layer_style.graphicOpacity = 1;
        var vectorLayer = new OpenLayers.Layer.Vector("Path", {
            style: layer_style,
            renderers: renderer,
            displayInLayerSwitcher: false
        });
        this.map.addLayer(vectorLayer);

        // style the sketch fancy
        var sketchSymbolizers = {
            "Point": {
                pointRadius: 4,
                graphicName: "square",
                fillColor: "white",
                fillOpacity: 1,
                strokeWidth: 1,
                strokeOpacity: 1,
                strokeColor: "#333333"
            },
            "Line": {
                strokeWidth: 6,
                strokeOpacity: 0.4,
                strokeColor: "#FF1111",
                strokeDashstyle: "solid"
            },
            "Polygon": {
                strokeWidth: 2,
                strokeOpacity: 1,
                strokeColor: "#666666",
                fillColor: "white",
                fillOpacity: 0.3
            }
        };
        var style = new OpenLayers.Style();
        style.addRules([new OpenLayers.Rule({
            symbolizer: sketchSymbolizers
        })]);
        var styleMap = new OpenLayers.StyleMap({
            "default": style
        });

        var maxVertices = 26;
        if(heightProvider == "mapquest")
            maxVertices = 2;
        // add profile tool to the map panel
        this.profileControl = new OpenLayers.Control.Measure(OpenLayers.Handler.Path, {
            eventListeners: {
                measure: function (evt) {
                    onProfilePathComplete(evt);
                },
                measurepartial: function (evt) {
                    onProfilePathPartial(evt);
                }
            },
            persist: false,
            handlerOptions: {
                maxVertices    : maxVertices, // we are running out of characters after 26
                freehandToggle : '',
                layerOptions   : {
                    styleMap: styleMap
                }
            }
        });
        this.map.addControl(this.profileControl);

    }
});

/** register as ux-extension of xtype = gxux_geonamessearchcombo */
Ext.reg('gxux_elevationProfileTool', GeoExt.ux.ElevationProfileTool);

/************************************************************************************
 *************************  start heightprofile.js functions ************************
 ************************************************************************************
 */

/**
 * function: onProfilePathComplete(evt)
 * description: Gets called when the user has drawn a path with the profile line
 * tool. This function prepares an array (segmentArray) which contains
 * all the informations of the drawn line segments (coordinates, length, azimuth
 * etc.)
 * parameters:
 * -    evt:    OpenLayers.Control.Measure "measure" event
 */

function onProfilePathComplete(evt) {
    var i;
    var pointCount = evt.geometry.components.length;
    var from; // OpenLayers Point
    var to; // OpenLayers Point
    var fromEllipsoidal; // x, y
    var toEllipsoidal; // x, y
    var fromLonLat; // lon, lat (OpenLayer.LonLat object) in [deg]
    var toLonLat; // lon, lat (OpenLayer.LonLat object) in [deg]
    var segmentLength; // [km]
    var totalLength = 0; // [km]
    var azimuth; // azimuth in [rad]
    var directionString; // direction of the segment: N, NE, E, SE, S a.s.o
    var segmentArray = []; // collect all the segments in this array
    var srcProj = globalMap.getProjectionObject(); // current map projection
    var wgs84 = new OpenLayers.Projection("EPSG:4326"); // let's store wgs84 coordinates
    // Let's remove the older markers first
    clearAllMarkers();
    // Add first marker:
    addMarkerToMap(evt.geometry.components[0].x, evt.geometry.components[0].y, 0);
    for (i = 1; i < pointCount; i++) {
        from = evt.geometry.components[i - 1];
        to = evt.geometry.components[i];
        fromEllipsoidal = from.clone().transform(srcProj, wgs84); // transform to wgs84
        toEllipsoidal = to.clone().transform(srcProj, wgs84);
        fromLonLat = new OpenLayers.LonLat(fromEllipsoidal.x, fromEllipsoidal.y);
        toLonLat = new OpenLayers.LonLat(toEllipsoidal.x, toEllipsoidal.y);
        segmentLength = OpenLayers.Util.distVincenty(fromLonLat, toLonLat);
        azimuth = azimuthApprox(from.y, from.x, to.y, to.x); // use directly x,y
        directionString = directionStringFromAzimuth(azimuth); // N, NE, E, SW etc.
        segmentArray.push({
            from: from,
            to: to,
            fromLonLat: fromLonLat,
            toLonLat: toLonLat,
            segmentLength: segmentLength,
            azimuth: azimuth,
            directionString: directionString,
            cumulativeLength: totalLength
        });

        totalLength += segmentLength;
        addMarkerToMap(to.x, to.y, i);
    }

    var pathCollection = {
        segmentArray: segmentArray,
        totalLength: totalLength
    };
    getHeightAlongPath(pathCollection, function (resultsArray, pathCollection) {
        if (resultsArray == null) {
            return;
        }
        drawHeightPath(resultsArray, pathCollection);
        window.closeProfileWindow();
        drawChart(resultsArray, pathCollection);
        window.createProfileWindow();
    });
}

function onProfilePathPartial(evt) {
    // we could do something cool and dynamic here
}

/**
 * function: drawHeightPath(resultsArray, pathCollection)
 * description: Draws the geodetic line according to the
 * drawn path.
 * parameters:
 * -    resultsArray   : Contains the lat, lon and height along the path
 * -    pathCollection : The original path segments, drawn by the user
 */

function drawHeightPath(resultsArray, pathCollection) {
    var vectorLayerArray = globalMap.getLayersByName("Path");
    if (vectorLayerArray.length != 1) {
        console.log('No path layer found');
        return;
    }
    var vectorLayer = vectorLayerArray[0];
    vectorLayer.destroyFeatures();

    var style_line = {
        strokeColor: "#FF1111",
        strokeWidth: 6,
        strokeDashstyle: "solid",
        strokeOpacity: 0.4,
        pointRadius: 6,
        pointerEvents: "visiblePainted"
    };

    // convert wgs84 input from function arguments to current system
    var nativeProj = globalMap.getProjectionObject();
    var wgs84 = new OpenLayers.Projection("EPSG:4326");
    var pWGS84;

    // create a line feature from a list of points
    var pointList = [];
    for (var i = 0; i < resultsArray.length; i++) {
        // we only draw every GEODETIC_LINE_SMOOTHERth point if it is not a breakpoint
        if (i % GEODETIC_LINE_SMOOTHER == 0 || resultsArray[i].breakPoint != null) {
            pWGS84 = new OpenLayers.LonLat(resultsArray[i].lon, resultsArray[i].lat);
            pWGS84.transform(wgs84, nativeProj);
            pointList.push(new OpenLayers.Geometry.Point(pWGS84.lon, pWGS84.lat));
        }
    }
    var lineFeature = new OpenLayers.Feature.Vector(
    new OpenLayers.Geometry.LineString(pointList), null, style_line);

    vectorLayer.addFeatures([lineFeature]);
}

/**
 * function: addMarkerToMap(lat, lon, markerIcon)
 * description: Adds a marker to the map's "Marker" layer.
 * This function is supposed to be used by the profile draw tool.
 * parameters:
 * -    x         : Longitude of the new marker (native projection)
 * -    y         : Latitude of the new marker (native projection)
 * -    markerIndex : Number of icon to be used (0 = A, 1 = B, ...)
 */

function addMarkerToMap(x, y, markerIndex) {
    var markerLayerArray = globalMap.getLayersByName("Markers");
    if (markerLayerArray.length != 1) {
        console.log('No marker layer found');
        return;
    }
    var markerLayer = markerLayerArray[0];

    // convert to a character from A-Z
    markerIndex = Math.min(markerIndex, 25);
    var markerLetter = String.fromCharCode(65 + markerIndex);

    var iconURL = PROFILE_DIR_PREFIX + "img/red_Marker" + markerLetter + ".png";
    var size = new OpenLayers.Size(20, 34);
    var offset = new OpenLayers.Pixel(-(size.w / 2), -size.h);
    var icon = new OpenLayers.Icon(iconURL, size, offset);
    markerLayer.addMarker(new OpenLayers.Marker(new OpenLayers.LonLat(x, y), icon));
}

/**
 * function: clearAllMarkers()
 * description: Remove all markers from the marker layer
 * and remove all drawings from the path vector layer.
 */

function clearAllMarkers() {
    var i;
    var markerLayerArray = globalMap.getLayersByName("Markers");
    if (markerLayerArray.length != 1) {
        return;
    }
    var markerLayer = markerLayerArray[0];
    var markerArray = markerLayer.markers;

    for (i = 0; i < markerArray.length; i++) {
        markerArray[i].destroy();
    }
    markerLayer.clearMarkers();

    var vectorLayerArray = globalMap.getLayersByName("Path");
    if (vectorLayerArray.length != 1) {
        console.log('No path layer found');
        return;
    }
    var vectorLayer = vectorLayerArray[0];
    vectorLayer.destroyFeatures();
}

/**
 * function: setMoveableMarker(lat, lon)
 * description: Set the moveable marker to a position
 * parameters:
 * -    lat       : Longitude of the new marker (WGS84)
 * -    lon       : Latitude of the new marker (WGS84)
 */

function setMoveableMarker(lat, lon) {
    var i;
    var markerLayerArray = globalMap.getLayersByName("Markers");
    if (markerLayerArray.length != 1) {
        return;
    }
    var markerLayer = markerLayerArray[0];
    var markerArray = markerLayer.markers;

    // convert wgs84 input from function arguments to current system
    var nativeProj = globalMap.getProjectionObject();
    var wgs84 = new OpenLayers.Projection("EPSG:4326");
    var pWGS84 = new OpenLayers.LonLat(lon, lat);
    var pNative = pWGS84.clone().transform(wgs84, nativeProj);

    // if we already have a moveable marker, just update the position
    for (i = 0; i < markerArray.length; i++) {
        if (markerArray[i].isMoveableMarker == true) {
            var px = globalMap.getLayerPxFromLonLat(pNative);
            markerArray[i].moveTo(px);
            markerArray[i].display(true);
            return;
        }
    }

    // We have not found our moveable marker layer, so we create it.
    // This is a sort of lazy loading.
    var iconURL = PROFILE_DIR_PREFIX + "img/blue_Marker.png";
    var size = new OpenLayers.Size(20, 34);
    var offset = new OpenLayers.Pixel(-(size.w / 2), -size.h);
    var icon = new OpenLayers.Icon(iconURL, size, offset);
    var marker = new OpenLayers.Marker(pNative, icon)
    marker.isMoveableMarker = true;
    markerLayer.addMarker(marker);
}

function clearMoveableMarker() {
    var markerLayerArray = globalMap.getLayersByName("Markers");
    if (markerLayerArray.length != 1) {
        return;
    }
    var markerLayer = markerLayerArray[0];
    var markerArray = markerLayer.markers;

    // searching for the marker and hiding it.
    for (var i = 0; i < markerArray.length; i++) {
        if (markerArray[i].isMoveableMarker == true) {
            markerArray[i].display(false);
            return;
        }
    }
}
/************************************************************************************
 *************************  end heightprofile.js functions **************************
 ************************************************************************************
 */


/************************************************************************************
 *************************  start height.js functions *******************************
 ************************************************************************************
 */



/**
 * function: getHeightAlongPath(pointArray, callback)
 * description: Gets the height from a path
 * The callback function gives you the following array, which consits of
 * several arrays for each line segment.
 *      [[{lat, lon, elevation}, ... ], [{lat, lon, elevation}, ... ], ... ]
 * parameters:
 * -    pathCollection:    (const) array with the following attributes per items:
 *                              from (current projection)
 *                              to (current projection)
 *                              fromLonLat (OpenLayer.LonLat, WGS84, deg)
 *                              toLonLat (OpenLayer.LonLat, WGS84, deg)
 *                              segmentLength (km)
 *                              azimuth (rad)
 *                              directionString
 *                              cumulativeLength (km) (length of previous segments)
 * -    callback: function pointer with the signature (returnArray, pathCollection)
 *
 * return: null (see callback function)
 */

function getHeightAlongPath(pathCollection, callback) {
    if (heightProvider == "mapquest") getHeightAlongPathMapQuest(pathCollection, callback);
    else // default provider: "google"
    getHeightAlongPathGoogle(pathCollection, callback);
}

/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
/* +++++++++++++++++++++++++++ Google Maps API ++++++++++++++++++++++++++++++++++++ */
/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
var HEIGHT_PATH_SAMPLES = 200;

/**
 * function: getHeightAlongPathGoogle(pathCollection, callback)
 * description: Gets the heights with the Google Maps API (see getHeightAlongPath
 * for details).
 */

function getHeightAlongPathGoogle(pathCollection, callback) {
    // Create an ElevationService.
    var elevator = new google.maps.ElevationService();
    var i;
    var segmentArray = pathCollection.segmentArray;
    var segCount = segmentArray.length; // segment count
    var path = new Array(segCount + 1); // e. g. 2 segments have 3 points
    // Create the path from the segments.
    for (i = 0; i < segCount; i++) {
        path[i] = new google.maps.LatLng(segmentArray[i].fromLonLat.lat, segmentArray[i].fromLonLat.lon);
    }
    path[segCount] = new google.maps.LatLng(segmentArray[segCount - 1].toLonLat.lat, segmentArray[segCount - 1].toLonLat.lon);

    // Create a PathElevationRequest object using this array.
    // Ask for 256 samples along that path.
    var pathRequest = {
        'path': path,
        'samples': HEIGHT_PATH_SAMPLES
    };

    // Initiate the path request.
    elevator.getElevationAlongPath(pathRequest, function (results, status) {
        googleElevationCallback(results, status, callback, pathCollection);
    });
}

/**
 * function: googleElevationCallback(results, status, callback, pathCollection)
 * description: Gets called by the Google Maps Elevation API.
 * parameters:
 * -    results:            Array with height informations
 * -    status:             Error message
 * -    callback:           Callback function of the original caller
 * -    pathCollection:     Path information
 */

function googleElevationCallback(results, status, callback, pathCollection) {
    if (status != google.maps.ElevationStatus.OK) {
        callback(null, null);
    }

    var i;
    var cIndex;
    var segmentArray = pathCollection.segmentArray;
    var returnArray = new Array(results.length);
    // the returnArray is filled with the height data
    for (i = 0; i < results.length; i++) {
        returnArray[i] = {
            lat: results[i].location.lat(),
            lon: results[i].location.lng(),
            elevation: results[i].elevation,
            breakPoint: null
        };
    }
    // now we set the breakPoint attribute for positions
    // where the path is changing its direction.
    // this can be used by the chart functions to add additional
    // informations to the chart.
    for (i = 0; i < segmentArray.length; i++) {
        cIndex = (returnArray.length - 1) * segmentArray[i].cumulativeLength / pathCollection.totalLength; // position in the path from 0..1
        cIndex = Math.round(cIndex); // we need an integer for the array index
        returnArray[cIndex].breakPoint = {
            azimuth: segmentArray[i].azimuth,
            directionString: segmentArray[i].directionString,
            index: i // segment index
        };
    }
    // set the breakpoint attribute of the last point,
    // but do net set azimuth or directionString, as they make no sense here
    returnArray[returnArray.length - 1].breakPoint = {
        azimuth: 0,
        directionString: "",
        index: i
    };
    callback(returnArray, pathCollection);
}

/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
/* +++++++++++++++++++++++++++ MapQuest API +++++++++++++++++++++++++++++++++++++++ */
/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

var HEIGHT_PATH_SAMPLES_MAPQUEST = 100;
var MAPQUEST_PRECISION = 5; // Don't change this, or else you need to change the compression algorithm too
// The following variables are used to store data until the MapQuest service
// response arived.
var g_mapquest_callback = null;
var g_mapquest_pathcollection = null;

/**
 * function: getHeightAlongPathMapQuest(pathCollection, callback)
 * description: Gets the heights with the MapQuest API (see getHeightAlongPath
 * for details).
 */

function getHeightAlongPathMapQuest(pathCollection, callback) {
    // Store the pathCollection and callback function in a global variable until
    // the async MapQuest response is available.
    g_mapquest_pathcollection = pathCollection;
    g_mapquest_callback = function (returnArray) {
        callback(returnArray, pathCollection);
    };
    mapquestRequest(pathCollection);
}

/**
 * function: getPathSamplePoints(pathCollection)
 * description: Gets sampled coordinates along the path.
 * parameters:
 * -    pathCollection:    (const) array with the following attributes per items:
 *                         from (current projection)
 *                         to (current projection)
 *                         fromLonLat (OpenLayers.LonLat, WGS84, deg)
 *                         toLonLat (OpenLayers.LonLat, WGS84, deg)
 *                         segmentLength (km)
 *                         azimuth (rad)
 *                         directionString
 *                         cumulativeLength (km) (length of previous segments)
 *
 * return: coordinate array
 */

function getPathSamplePoints(pathCollection) {
    var samplepoints = HEIGHT_PATH_SAMPLES_MAPQUEST;
    var singleSegment = pathCollection.totalLength / samplepoints; // unit [km]
    var pathArray = [];
    var segmentArray = pathCollection.segmentArray;
    var segCount = segmentArray.length;
    var i;
    var lonEnd, latEnd, lonStart, latStart;
    var pointsInSegment;

    // Create the path from the segments.
    for (i = 0; i < segCount; i++) {
        latStart = segmentArray[i].fromLonLat.lat;
        lonStart = segmentArray[i].fromLonLat.lon;
        latEnd = segmentArray[i].toLonLat.lat;
        lonEnd = segmentArray[i].toLonLat.lon;

        // naive non-geodetic curve:
        var dx = (lonEnd - lonStart) * (singleSegment / pathCollection.totalLength);
        var dy = (latEnd - latStart) * (singleSegment / pathCollection.totalLength);

        pointsInSegment = Math.floor(segmentArray[i].segmentLength / singleSegment);
        var currentLonLat = new OpenLayers.LonLat(lonStart, latStart);
        for (i = 0; i < pointsInSegment; i++) {
            pathArray.push(currentLonLat.lat);
            pathArray.push(currentLonLat.lon);
            currentLonLat = currentLonLat.add(dx, dy);
        }
    }
    pathArray.push(latEnd);
    pathArray.push(lonEnd);
    return pathArray;
}

/**
 * function: mapquestRequest(pathCollection, callback)
 * description: Starts a MapQuest Elevation API call.
 * This is a async function. After completion, the callback function returns the
 * results.
 * parameters:
 * -    pathCollection:     Path segments from the user
 * -    callback:           Callback function of the original caller
 */

function mapquestRequest(pathCollection, callback) {
    var mapquestURL = 'http://open.mapquestapi.com';
    var urlreq = mapquestURL + '/elevation/v1/getElevationProfile?callback=mapquestResponse&useFilter=true&shapeFormat=cmp&inShapeFormat=cmp&outShapeFormat=cmp';
    var pathArray = getPathSamplePoints(pathCollection);
    var compressed = compress(pathArray, MAPQUEST_PRECISION);
    var script = document.createElement('script');
    script.type = 'text/javascript';

    urlreq += '&latLngCollection=';
    urlreq += compressed;

    script.src = urlreq;
    document.body.appendChild(script);
}

/**
 * function: mapquestResponse(response)
 * description: Called by MapQuest, when the function call is complete.
 * parameters:
 * -    response:       Data provided by MapQuest (see MapQuest API docu)
 */

function mapquestResponse(response) {
    var i;
    if (response.info.statuscode != 0) {
        var errstr = "";
        for (i = 0; i < response.info.messages.length; i++) {
            errstr += response.info.messages[i] + "\n";
        };
        console.log(errstr);
        Ext.Msg.alert('MapQuest error', errstr);
        g_mapquest_callback(null);
    }
    var points = decompress(response.shapePoints, MAPQUEST_PRECISION);
    var path = response.elevationProfile;
    var html = '';
    // path[i].height;
    // path[i].distance;
    var cIndex;
    var segmentArray = g_mapquest_pathcollection.segmentArray;
    var returnArray = new Array(path.length);
    // the returnArray is filled with the height data
    for (i = 0; i < path.length; i++) {
        returnArray[i] = {
            lat: points[(i * 2)],
            // lat
            lon: points[(i * 2) + 1],
            // lon
            elevation: path[i].height,
            // height
            breakPoint: null
        };
    }
    // now we set the breakPoint attribute for positions
    // where the path is changing its direction.
    // this can be used by the chart functions to add additional
    // informations to the chart.
    for (i = 0; i < segmentArray.length; i++) {
        cIndex = (returnArray.length - 1) * segmentArray[i].cumulativeLength / g_mapquest_pathcollection.totalLength; // position in the path from 0..1
        cIndex = Math.round(cIndex); // we need an integer for the array index
        returnArray[cIndex].breakPoint = {
            azimuth: segmentArray[i].azimuth,
            directionString: segmentArray[i].directionString,
            index: i // segment index
        };
    }
    // set the breakpoint attribute of the last point,
    // but do net set azimuth or directionString, as they make no sense here
    returnArray[returnArray.length - 1].breakPoint = {
        azimuth: 0,
        directionString: "",
        index: i
    };
    g_mapquest_callback(returnArray);
}

/**
 * function: decompress(encoded, precision)
 * description: MapQuest decompression for coordinates.
 * See: http://open.mapquestapi.com/common/encodedecode.html
 */

function decompress(encoded, precision) {
    precision = Math.pow(10, -precision);
    var len = encoded.length,
        index = 0,
        lat = 0,
        lng = 0,
        array = [];
    while (index < len) {
        var b, shift = 0,
            result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlat = ((result & 1) ? ~ (result >> 1) : (result >> 1));
        lat += dlat;
        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlng = ((result & 1) ? ~ (result >> 1) : (result >> 1));
        lng += dlng;
        array.push(lat * precision);
        array.push(lng * precision);
    }
    return array;
}

/**
 * function: compress(points, precision)
 * description: MapQuest compression for coordinates.
 * See: http://open.mapquestapi.com/common/encodedecode.html
 */

function compress(points, precision) {
    var oldLat = 0,
        oldLng = 0,
        len = points.length,
        index = 0;
    var encoded = '';
    precision = Math.pow(10, precision);
    while (index < len) {
        //  Round to N decimal places
        var lat = Math.round(points[index++] * precision);
        var lng = Math.round(points[index++] * precision);

        //  Encode the differences between the points
        encoded += encodeNumber(lat - oldLat);
        encoded += encodeNumber(lng - oldLng);

        oldLat = lat;
        oldLng = lng;
    }
    return encoded;
}

/**
 * function: encodeNumber(num)
 * description: MapQuest compression for coordinates.
 * See: http://open.mapquestapi.com/common/encodedecode.html
 */

function encodeNumber(num) {
    var num = num << 1;
    if (num < 0) {
        num = ~ (num);
    }
    var encoded = '';
    while (num >= 0x20) {
        encoded += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
        num >>= 5;
    }
    encoded += String.fromCharCode(num + 63);
    return encoded;
}
/************************************************************************************
 *************************  end height.js functions *********************************
 ************************************************************************************
 */

/************************************************************************************
 *************************  start pathdirection.js functions ************************
 ************************************************************************************
 */

/**
 * function: directionString(latStart, lonStart, latEnd, lonEnd)
 * description: direction string "N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"
 * parameters:
 * -    latStart:   latitude of starting point [rad]
 * -    lonStart:   longitude of starting point [rad]
 * -    latEnd:     latitude of end point [rad]
 * -    lonEnd:     longitude of end point [rad]
 * return:  String: String from azimuth:  "N", "NE", "E", "SE", "S", "SW", "W",
 * "NW", "N"
 */

function directionString(latStart, lonStart, latEnd, lonEnd) {
    var azimuth = azimuthApprox(latStart, lonStart, latEnd, lonEnd);
    return azimuthStringFromAzimuth(azimuth);
}

/**
 * function: directionStringFromAzimuth(azimuth)
 * description: direction string "N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"
 * parameters:
 * -    azimuth:    azimuth [rad]
 * return:  String
 */

function directionStringFromAzimuth(azimuth) {
    var azStrTable = [getI18Nstr("north", "North"), getI18Nstr("northeast", "North-East"), getI18Nstr("east", "East"), getI18Nstr("southeast", "South-East"), getI18Nstr("south", "South"), getI18Nstr("southwest", "South-West"), getI18Nstr("west", "West"), getI18Nstr("northwest", "North-West"), getI18Nstr("North", "North")];
    var index = Math.round(8 * azimuth / (Math.PI * 2));
    return azStrTable[index];
}

/**
 * function: azimuthApprox(latStart, lonStart, latEnd, lonEnd)
 * description: Calculate estimated azimuth between two points.
 * Warning: This is not a strict geodetic calculation.
 * parameters:
 * -    latStart:   latitude of starting point [rad]
 * -    lonStart:   longitude of starting point [rad]
 * -    latEnd:     latitude of end point [rad]
 * -    lonEnd:     longitude of end point [rad]
 * return:  Number azimuth: approximated azimuth
 */

function azimuthApprox(latStart, lonStart, latEnd, lonEnd) {
    // This is basically the "zweite geodätische Hauptaufgabe"
    // A strict solution can be found in:
    // http://www.gia.rwth-aachen.de/Forschung/AngwGeodaesie/geodaetische_linie/artikel1/node7.html
    // RWTH Aachen, Institut für Geodäsie
    var dB = latEnd - latStart;
    var dL = lonEnd - lonStart;
    var az = Math.atan2(dL, dB); // this gives us the angle from the north-axis in clockwise order
    if (az < 0) {
        az += 2 * Math.PI; // we only want positive values
    }
    return az;
}
/************************************************************************************
 *************************  end pathdirection.js functions **************************
 ************************************************************************************
 */

/************************************************************************************
 *************************  start profilechart.js functions *************************
 ************************************************************************************
 */

//declare global variables
var win;
var elevationChart;
var currentStoreData = []; //current elevation data
var minElevation; //minimum elavation on y-axis
var maxElevation; //maximum elevation on y-axis
var totalLength; //length of path
var currentMaxElevation; //needed to store current maximum elevation. if you change minimum y value, this value is taken as maximum
var maxVertExag; //value gets calculated each time window gets resized or redrawn
/**
 * function: Ext4.onReady()
 * description: Initiation function for Extjs 4 Sandbox. It gets called when page is ready
 */
Ext4.onReady(function () {
    Ext4.QuickTips.init();
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    //+++++++++++++++++++++++++++++++ ExtJS 4 STORES ++++++++++++++++++++++++++++++++++++++++++++++++++++++
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    //JsonStore = base data for elevation
    window.elevationStore = Ext4.create('Ext4.data.JsonStore', {
        proxy: {
            type: 'localstorage',
            id: 'localStore'
        },
        fields: ['index', 'elevation', 'lat', 'lon', 'markerElevation', 'direction', 'markerNo', 'markerIndex', 'xAxisLength', 'displayElevation']
    });

    //store for vertical Exaggeration combobox
    var vertExagStore = Ext4.create('Ext4.data.Store', {
        fields: ['dispVal', 'value'],
        autoLoad: true,
        data: [{
            "dispVal": "0.25",
            "value": 0.25
        }, {
            "dispVal": "0.5",
            "value": 0.5
        }, {
            "dispVal": "1",
            "value": 1
        }, {
            "dispVal": "2",
            "value": 2
        }, {
            "dispVal": "2.5",
            "value": 2.5
        }, {
            "dispVal": "5",
            "value": 5
        }, {
            "dispVal": "10",
            "value": 10
        }, {
            "dispVal": "20",
            "value": 20
        }, {
            "dispVal": "50",
            "value": 50
        }, {
            "dispVal": "100",
            "value": 100
        }, {
            "dispVal": "200",
            "value": 200
        }, {
            "dispVal": "500",
            "value": 500
        }, {
            "dispVal": "1000",
            "value": 1000
        }, {
            "dispVal": "2000",
            "value": 2000
        }, {
            "dispVal": "5000",
            "value": 5000
        }, {
            "dispVal": "10000",
            "value": 10000
        }]
    });

    //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    //+++++++++++++++++++++++++++++++ ExtJS 4 Configurations ++++++++++++++++++++++++++++++++++++++
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    //read-only textfield displays the maximum vertical exaggeration, which can be typed in to display whole data
    var maxVertExagText = {
        xtype: 'displayfield',
        id: 'maxVertExagText',
        fieldLabel: getI18Nstr("maxexagg", "Max Vertical Exaggeration"),
        labelAlign: 'top',
        height: 50
    }

    //combobox for vertical exaggeration. User can either choose data or enter new value by hand.
    // The new value should be smaller than maximum vertical exaggeration
    var comboVertExag = {
        xtype: 'combobox',
        id: 'comboVertExag',
        fieldLabel: getI18Nstr("chooseexagg", "Choose Vertical Exaggeration"),
        labelAlign: 'top',
        height: 55,
        store: vertExagStore,
        queryMode: 'local',
        displayField: 'dispVal',
        valueField: 'value',
        validator: function (value) {
            //input validation for vertExag combobox
            //check if value is a number
            if (isNaN(value)) {
                Ext4.getCmp('applyVertExagButton').setDisabled(true);
                return getI18Nstr("nan", "Value is not a number");
            }
            //check if value is bigger than 0
            else if (parseFloat(value) <= 0) {
                Ext4.getCmp('applyVertExagButton').setDisabled(true);
                return getI18Nstr("biggerthan0", "Value must be bigger than 0");
            } else if (parseFloat(value) <= maxVertExag && parseFloat(value) > 0) {
                Ext4.getCmp('applyVertExagButton').setDisabled(false);
                return true;
            } else if (value == "") {
                Ext4.getCmp('applyVertExagButton').setDisabled(true);
                return true;
            }
            //else value is bigger than maximal vertExag
            else {
                Ext4.getCmp('applyVertExagButton').setDisabled(true);
                return getI18Nstr("biggerthanmax", "Value is bigger than max vertical exaggeration");
            }
        }
    }

    //combobox for vertical exaggeration. User can either choose data or enter new value by hand.
    // The new value should be smaller than maximum vertical exaggeration
    var applyVertExagButton = {
        xtype: 'button',
        id: 'applyVertExagButton',
        text: getI18Nstr("apply", "Apply"),
        scale: 'medium',
        handler: function () {
            //the new vertical range gets calculated by the entered value. This value gets added to the minimal y-axis value from numberfield
            var comboValue = parseFloat(Ext4.getCmp('comboVertExag').getValue());
            var vertRange = parseInt(Ext4.getCmp('yStartValueTxt').getValue()) + calcVertRange(comboValue);
            //the chart gets only redrawn, if the new value is bigger than the maximum elevation
            if (vertRange > maxElevation) {
                //remove chart from container
                Ext4.getCmp('chartContainer').removeAll();
                //round vertical range to 50er
                vertRange = (Math.floor(vertRange / 50) * 50);
                createElevationChart(parseInt(Ext4.getCmp('yStartValueTxt').getValue()), vertRange);
                //filter data, that is smaller than min value from y-axis-value field and display it in chart
                elevationStore.loadData(filterDataByMinValue(parseInt(Ext4.getCmp('yStartValueTxt').getValue())));
                Ext4.getCmp('vertExagNumberField').setValue(comboValue);
                currentMaxElevation = vertRange;
            }
        }
    }
    /**
     * function: createHeightStartValueField(Number min, Number max)
     * description: configuration function for starting y-value. Minimum and Maximum-value get passed.
     * function gets called while creating profile window.
     * parameters:
     * -    min:    minimum value as number (lowest value from data)
     * -    max:    maximum value as number (highest value from data)
     * return:  configuration for y-value numberfield
     */

    function createHeightStartValueField(min, max) {
        return {
            xtype: 'numberfield',
            id: 'yStartValueTxt',
            fieldLabel: getI18Nstr("yaxis", "Y-Axis"),
            labelAlign: 'top',
            value: min,
            maxValue: max - 50,
            //abstract 50 to always show region of at least 50m
            minValue: min,
            height: 55,
            disableKeyFilter: true,
            keyNavEnabled: true,
            border: false,
            decimalSeparator: ',',
            decimalPrecision: 0,
            style: {
                paddingTop: 10
            },
            step: 50,
            editable: true,
            listeners: {
                change: {
                    fn: function (obj, newVal, oldVal) {
                        //only redraw chart when new value between min-max range
                        if (parseInt(newVal) <= obj.maxValue && parseInt(newVal) >= obj.minValue) {
                            Ext4.getCmp('chartContainer').removeAll();
                            //draw new axis with new min-value
                            createElevationChart(parseInt(newVal), currentMaxElevation);
                            //filter data, that is smaller than new min value and display it in chart
                            elevationStore.loadData(filterDataByMinValue(parseInt(newVal)));
                        }
                    }
                }
            }

        };
    }

    /**
     * function: createVertExagNumberField()
     * description: configuration function for vertical exaggeration displayfield. This field is not editable by the user and displays current
     * vertical exaggeration as soon as chart gets resized or any input value changes.
     * return:  configuration for vertical exaggeration displayfield
     */

    function createVertExagNumberField() {
        return {
            xtype: 'displayfield',
            id: 'vertExagNumberField',
            fieldLabel: getI18Nstr("vertexagg", "Vertical Exaggeration"),
            labelAlign: 'top',
            height: 55,
            value: 1
        };
    }

    //read-only textfield displays the maximum vertical exaggeration, which can be typed in to display whole data
    var minYAxisText = {
        xtype: 'displayfield',
        id: 'minYAxisText',
        fieldLabel: getI18Nstr("min", "Min"),
        labelAlign: 'left',
        labelWidth: 35,
        height: 20
    }
    //read-only textfield displays the maximum vertical exaggeration, which can be typed in to display whole data
    var maxYAxisText = {
        xtype: 'displayfield',
        id: 'maxYAxisText',
        fieldLabel: getI18Nstr("max", "Max"),
        labelAlign: 'left',
        labelWidth: 35,
        height: 20
    }
    //main control panel holds all controls
    var northControlPanel = {
        id: 'northControlPanel',
        xtype: 'panel',
        height: 130,
        bodyStyle: {
            background: '#dfe8f6 '
        },
        border: true,
        region: 'north',
        layout: {
            type: 'vbox',
            align: 'stretch',
            padding: 5
        },
        items: [createVertExagNumberField(), maxVertExagText]
    }

    //main control panel holds all controls
    var mainControlPanel = {
        id: 'mainControlPanel',
        xtype: 'container',
        region: 'center',
        layout: {
            type: 'vbox',
            align: 'stretch',
            padding: 5
        },
        items: [comboVertExag, applyVertExagButton]
    }


    var southControlPanel = {
        id: 'southControlPanel',
        xtype: 'panel',
        height: 80,
        bodyStyle: {
            background: '#dfe8f6 '
        },
        border: false,
        region: 'south',
        layout: {
            type: 'vbox',
            align: 'stretch',
            padding: 5
        },
        items: [{
            id: 'geomatikImgPanel',
            height: 30,
            xtype: 'image',
            listeners: {
                render: function (c) {
                    Ext4.QuickTips.register({
                        target: c.el,
                        dismissDelay:20000,
                        text: getI18Nstr("aboutText")
                    });
                    c.el.on({
                        'click': function () {
                            window.open('http://www.hs-karlsruhe.de/fakultaeten/geomatik.html');
                        }
                    });

                }
            },
            src: PROFILE_DIR_PREFIX + 'img/geomatikLogo.png'
        }, {
            id: 'mapQuestImgPanel',
            height: 40,
            xtype: 'image',
            src: PROFILE_DIR_PREFIX + 'img/mapquest_Logo_Med.png'
        }]
        //items:[minYAxisText,maxYAxisText]
    }

    /**
     * function: createElevationChart(Number min, Number max)
     * description: function creates configuration for elevation-chart and adds it to 'chartContainer' in profile window.
     * The minimum value and maximum value for y-axis get passed. Function gets called when main profile window gets created
     * and when yStartValue-numberfield value changes.
     * parameters:
     * -    min:    minimum value sets min-value of y-axis in chart.
     * -    max:    maximum value sets max-value of y-axis in chart.
     */

    function createElevationChart(min, max) {
        elevationChart = {
            id: 'elevationChart',
            xtype: 'chart',
            animate: true,
            store: elevationStore,
            listeners: {
                resize: {
                    fn: function (obj, newWidth, newSize) {
                        var vertExag = Math.floor(calcVertExag() * Math.pow(10, 2)) / Math.pow(10, 2);
                        Ext4.getCmp('vertExagNumberField').setValue(vertExag);
                        Ext4.getCmp('maxVertExagText').setValue(Math.floor(calcMaxVertExag() * Math.pow(10, 2)) / Math.pow(10, 2));
                        Ext4.getCmp('comboVertExag').validate();
                        //apply filter to combobox
                        //before applying, clear filter
                        var ds = vertExagStore;
                        if (ds.realSnapshot && ds.realSnapshot != ds.snapshot) {
                            ds.snapshot = ds.realSnapshot;
                            delete ds.realSnapshot;
                        }
                        ds.clearFilter(true);
                        //filter values smaller than maxVertExag out of combobox
                        ds.filterBy(function fn(obj) {
                            if (obj.get('value') < maxVertExag) {
                                return true;
                            } else {
                                return false;
                            }
                        });
                        ds.realSnapshot = ds.snapshot;
                        ds.snapshot = ds.data;
                    }
                }
            },
            shadow: false,
            theme: 'Blue',
            axes: [{ //y-axis config
                type: 'Numeric',
                id: 'yValAxis',
                xtype: 'Axis',
                minimum: min,
                maximum: max,
                adjustMinimumByMajorUnit: false,
                decimals: 0,
                position: 'left',
                majorTickSteps: 9,
                fields: ['elevation'],
                title: getI18Nstr("heightinm", "Height [m]"),
                grid: {
                    odd: {
                        opacity: 1,
                        fill: '#ddd',
                        stroke: '#bbb',
                        'stroke-width': 0.5
                    }
                }
            }, { //x-axis config
                type: 'Numeric',
                position: 'bottom',
                maximum: totalLength,
                fields: ['xAxisLength'],
                decimals: 1,
                title: getI18Nstr("pathinkm", "Path [km]"),
            }],
            series: [{ //chart data
                type: 'area',
                //elevation data as area series
                highlight: true,
                axis: 'left',
                grid: true,
                smooth: false,
                field: 'index',
                style: {
                    opacity: 0.7
                },
                xField: 'index',
                yField: 'elevation',
                tips: {
                    trackMouse: true,
                    width: 165,
                    height: 50,
                    renderer: function (storeItem, item) {
                        //cut digits
                        var elevation = Math.floor(storeItem.get('displayElevation'));
                        //set number of digits for coordinates
                        var digits = 7;
                        var lat = storeItem.get('lat');
                        var lon = storeItem.get('lon');
                        // show marker on map
                        setMoveableMarker(lat, lon);
                        //set digit number, convert to string and replace "." with ","
                        lat = (Math.floor(lat * Math.pow(10, digits)) / Math.pow(10, digits) + '').replace(".", getI18Nstr("numsep", "."));
                        lon = (Math.floor(lon * Math.pow(10, digits)) / Math.pow(10, digits) + '').replace(".", getI18Nstr("numsep", "."));
                        //tooltip text
                        this.setTitle(getI18Nstr("height", "Height") + ': ' + elevation + ' m <br> ' + getI18Nstr("lat", "Latitude") + ': ' + lat + '<br> ' + getI18Nstr("lon", "Longitude") + ': ' + lon);
                    }
                },
            }, { //display marker on map as points at top of chart area
                type: 'scatter',
                highlight: false,
                axis: 'left',
                markerConfig: {
                    type: 'circle',
                    radius: 10,
                    fill: '#FF0000',
                    'stroke-width': 0
                },
                label: {
                    display: 'middle',
                    field: 'index',
                    renderer: function (n) {
                        //show marker Char
                        //convert via ascii code to char
                        return String.fromCharCode(n + 65) /*+': ' + elevationStore.findRecord('markerIndex',n+1).get('direction')*/
                        ;
                    },
                    'text-anchor': 'middle',
                    contrast: false
                },

                xField: 'index',
                yField: 'markerElevation',
                tips: {
                    trackMouse: false,
                    autoScroll: true,
                    width: 170,
                    height: 60,
                    renderer: function (storeItem, item) {
                        //cut digits
                        var elevation = Math.floor(storeItem.get('displayElevation'));
                        //set number of digits for coordinates
                        var digits = 7;
                        var lat = storeItem.get('lat');
                        var lon = storeItem.get('lon');
                        // show marker on map
                        setMoveableMarker(lat, lon);
                        //set digit number, convert to string and replace "." with ","
                        lat = (Math.floor(lat * Math.pow(10, digits)) / Math.pow(10, digits) + '').replace(".", getI18Nstr("numsep", "."));
                        lon = (Math.floor(lon * Math.pow(10, digits)) / Math.pow(10, digits) + '').replace(".", getI18Nstr("numsep", "."));
                        //tooltip text
                        //do not display direction for last marker point
                        if (storeItem.get('direction') != "") {
                            this.setTitle(getI18Nstr("height", "Height") + ': ' + elevation + ' m <br> ' + getI18Nstr("lat", "Latitude") + ': ' + lat + '<br> ' + getI18Nstr("lon", "Longitude") + ': ' + lon + '<br>' + getI18Nstr("dir", "Direction") + ': ' + storeItem.get('direction'));
                        } else {
                            this.setTitle(getI18Nstr("height", "Height") + ': ' + elevation + ' m <br> ' + getI18Nstr("lat", "Latitude") + ': ' + lat + '<br> ' + getI18Nstr("lon", "Longitude") + ': ' + lon + '<br>   <br>');
                        }
                    }
                }
            }]
        };
        //add chart to 'chartContainer' in profile window
        Ext4.getCmp('chartContainer').add(elevationChart);
    }

    /**
     * function: createProfileWindow()
     * description: function creates main profile window, which holds chart, slider and numberfield
     */
    window.createProfileWindow = function () {
        // detect lowest value from data and save it in 'minElevation'
        minElevation = Math.floor(elevationStore.min('elevation'));
        //round minimum value to 50er
        minElevation = (Math.floor(minElevation / 50) * 50);
        //detect highest value from data
        maxElevation = Math.floor(elevationStore.max('elevation'));
        //round maximum value to next higher hundreder and add 100
        maxElevation = (Math.floor(maxElevation / 50) * 50) + 50;
        currentMaxElevation = maxElevation;
        //create window component
        win = Ext4.createWidget('window', {
            id: 'chartWindow',
            width: 700,
            height: 400,
            x: 100,
            y: 100,
            hidden: false,
            maximizable: true,
            title: getI18Nstr("heightprofile", "Height Profile"),
            renderTo: Ext4.getBody(),
            layout: 'fit',
            items: [{
                xtype: 'panel',
                style: 'border: 1px solid #666',
                layout: {
                    type: 'hbox',
                    align: 'stretch'
                },
                items: [{
                    xtype: 'panel',
                    flex: 1,
                    border: true,
                    height: 100,
                    minWidth: 100,
                    layout: 'border',
                    items: [northControlPanel, mainControlPanel, southControlPanel]
                }, {
                    xtype: 'container',
                    id: 'chartContainer',
                    flex: 8,
                    border: false,
                    height: 450,
                    layout: {
                        type: 'fit'
                    },
                    items: [] //leave item empty, because it gets generated and added through createElevationChart()-function
                }]
            }]

        });
        //remove imagePanel if heightprovider not mapquest
        if (heightProvider != 'mapquest') {
            Ext4.getCmp('southControlPanel').remove('mapQuestImgPanel');
            //Ext4.getCmp('southControlPanel').setVisible(false);
        }
        //add min y-value-axis numberfield
        Ext4.getCmp('mainControlPanel').add(createHeightStartValueField(minElevation, maxElevation));
        //add chart to main panel
        createElevationChart(minElevation, maxElevation);
        //calculate current vertical exaggeration and set value to textfields, rounded to 2 digits
        var vertExag = Math.floor(calcVertExag() * Math.pow(10, 2)) / Math.pow(10, 2);
        Ext4.getCmp('vertExagNumberField').setValue(vertExag);
        //Ext4.getCmp('minYAxisText').setValue(minElevation);
        //Ext4.getCmp('maxYAxisText').setValue(maxElevation-50);
    }
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    //+++++++++++++++++++++++++++++++ ExtJS 4 FUNCTIONS +++++++++++++++++++++++++++++++++++++++++++
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    /**
     * function: closeProfileWindow()
     * description: Function closes profile window
     */
    window.closeProfileWindow = function () {
        if (win != undefined) {
            win.destroy();
        }
    }
    /**
     * function: generateElevationDataFromResults(Array results, Number totalLength)
     * description: Function parses result-array from elevation service and puts result data into return-array.
     * Return-array acts as data for JSON-Store --> chart-data
     * parameters:
     * -    results:        array returned from elevation-service
     * -    totalLength:    total length of all path segments
     * return:  Array data: array for chart-data. Fields: [index, elevation, lat, lon]
     */
    window.generateElevationDataFromResults = function (results, totalLength) {
        var data = [];
        //calculate length bewtween two elevation points
        var gapLength = totalLength / results.length;
        var totalGapLength = 0;
        //get max Elevation for marker label placement in chart
        maxElevation = results[0].elevation;
        for (var i = 1; i < results.length; i++) {
            if (results[i].elevation >= maxElevation) {
                maxElevation = results[i].elevation;
            }
        }
        //round it to a 50er value and add offset. Marker labels must be always visible
        maxElevation = (Math.floor(maxElevation / 50) * 50) + 47;
        //loop throug elevation array and push data to elevation store
        for (var i = 0; i < results.length; i++) {
            //check if elevation point is marker
            if (results[i].breakPoint) {
                data.push({
                    index: i,
                    elevation: results[i].elevation,
                    //elevation can be changed through filter, this is why displayElevation is needed to be shown in tooltip
                    displayElevation: results[i].elevation,
                    lat: results[i].lat,
                    lon: results[i].lon,
                    markerElevation: maxElevation,
                    direction: results[i].breakPoint.directionString,
                    markerNo: String.fromCharCode(results[i].breakPoint.index + 65),
                    markerIndex: results[i].breakPoint.index,
                    xAxisLength: totalGapLength
                });
            } else {
                data.push({
                    index: i,
                    elevation: results[i].elevation,
                    displayElevation: results[i].elevation,
                    lat: results[i].lat,
                    lon: results[i].lon,
                    xAxisLength: totalGapLength
                });
            }
            //add length between two points to length (needed for labelling x-axis)
            totalGapLength += gapLength;
        }
        //save current data to global array
        currentStoreData = cloneArray(data);
        return data;
    };
    /**
     * function: drawChart(elevationArray, pathCollection)
     * description: Function generates data for JsonStore from result of elevation service
     * and loads it into elevationStore. After doing this, chart gets redrawn with new data.
     * parameters:
     * -    elevationArray:    return array from elevation service. Fields:
     *                              elevation
     *                              latitude
     *                              longitude
     *                              breakPoint = null // if not a breakpoint
     *                              breakPoint.azimuth // [rad]
     *                              breakPoint.directionString // N, E, SW, etc.
     *                              breakPoint.index // segment index
     *
     * -    pathCollection:    (const) array with the following attributes per items:
     *                              from (current projection)
     *                              to (current projection)
     *                              fromLonLat (OpenLayer.LonLat, WGS84, deg)
     *                              toLonLat (OpenLayer.LonLat, WGS84, deg)
     *                              segmentLength (km)
     *                              azimuth (rad)
     *                              directionString
     *                              cumulativeLength (km)
     */
    window.drawChart = function (elevationArray, pathCollection) {
        totalLength = pathCollection.totalLength;
        elevationStore.loadData(generateElevationDataFromResults(elevationArray, totalLength));
    }
    /**
     * function: filterDataByMinValue(Number min)
     * description: function loops through currentDataStore and checks if each value is bigger than passed min-value.
     *              When value is smaller then min-value, it gets set to min-value in order to still display it in chart at the bottom.
     *              Filter-function of Store-class wouldn't display it.
     * parameters:
     * -    min:    minimum value from starting y-value-numberfield.
     * return:  Array retData: Array with updated elevations
     * */

    function filterDataByMinValue(min) {
        var retData = cloneArray(currentStoreData);
        for (var i = 0; i < retData.length; i++) {
            if (retData[i].elevation <= min) {
                retData[i].elevation = min;
            }
        }
        return retData;
    }

    /**
     * function: calcVertRange(Number vertExag)
     * description: Function calculates vertical range for given vertical exaggeration. This range is used as maximum value for y-axis
     *              in chart after applying new vertical exaggeration.
     * parameters:
     * -    vertExag:    vertical exaggeration as float from vertical exaggeration combobox.
     * return:  number range: new vertical range
     * */

    function calcVertRange(vertExag) {
        //get max value from x-axis
        var maxHor = Ext4.getCmp('elevationChart').axes.items[1].to;
        maxHor = Math.floor(maxHor * Math.pow(10, 1)) / Math.pow(10, 1)
        //calculate width of x-axis in pixels by abstractin constant pixel value from chart-width(=width of whole chart area)
        var chartWidth = Ext4.getCmp('elevationChart').getWidth() - 90;
        //calculate horizontal scale
        var horScale = maxHor / chartWidth;
        //calculate height of y-axis in pixels by abstractin constant pixel value from chart-height(=height of whole chart area)
        var chartHeight = Ext4.getCmp('elevationChart').getHeight() - 74;
        var range = horScale * (chartHeight / vertExag);
        //multiplicate by 1000, because unit of x-axis=km and unit of y-axis=m
        return range * 1000;
    }

    /**
     * function: calcVertExag()
     * description: Function calculates current vertical exaggeration by using range of elevation chart
     * return:  number vertExag: current vertical exaggeration
     * */

    function calcVertExag() {
        //get max value from x-axis
        var maxHor = Ext4.getCmp('elevationChart').axes.items[1].to;
        maxHor = Math.floor(maxHor * Math.pow(10, 1)) / Math.pow(10, 1)
        //calculate width of x-axis in pixels by abstractin constant pixel value from chart-width(=width of whole chart area)
        var chartWidth = Ext4.getCmp('elevationChart').getWidth() - 90;
        //calculate horizontal scale
        var horScale = maxHor / chartWidth;
        //calculate height of y-axis in pixels by abstractin constant pixel value from chart-height(=height of whole chart area)
        var chartHeight = Ext4.getCmp('elevationChart').getHeight() - 74;
        //get current range by abstracting y-axis min value from y-axis max value
        var range = Ext4.getCmp('elevationChart').axes.items[0].to - Ext4.getCmp('elevationChart').axes.items[0].from;
        //caluclate vertical scale
        var vertScale = range * 0.001 / chartHeight;
        var vertExag = horScale / vertScale;
        return vertExag;
    }

    /**
     * function: calcMaxVertExag()
     * description: Function calculates maximum current vertical exaggeration by using maximum value from data
     *              and min value from y-axis-start-numberfield as range
     * * return:  number vertExag: maximal vertical exaggeration
     * */

    function calcMaxVertExag() {
        //get max value from x-axis
        var maxHor = Ext4.getCmp('elevationChart').axes.items[1].to;
        maxHor = Math.floor(maxHor * Math.pow(10, 1)) / Math.pow(10, 1)
        //calculate width of x-axis in pixels by abstractin constant pixel value from chart-width(=width of whole chart area)
        var chartWidth = Ext4.getCmp('elevationChart').getWidth() - 90;
        //calculate horizontal scale
        var horScale = maxHor / chartWidth;
        //calculate height of y-axis in pixels by abstractin constant pixel value from chart-height(=height of whole chart area)
        var chartHeight = Ext4.getCmp('elevationChart').getHeight() - 74;
        //calculate range by using max value from data and value from y-axis-start-numberfield
        var range = maxElevation - parseInt(Ext4.getCmp('yStartValueTxt').getValue());
        //caluclate vertical scale
        var vertScale = range * 0.001 / chartHeight;
        var vertExag = horScale / vertScale;
        maxVertExag = vertExag;
        return vertExag;
    }

});
/**
 * function: cloneArray(Array soureArr)
 * description: recursive function duplicates array
 * parameters:
 * -    soureArr:    source-array
 * return:  Array clonedArr: copy of array
 * */

function cloneArray(soureArr) {
    var clonedArr = (soureArr instanceof Array) ? [] : {};
    for (i in soureArr) {
        if (i == 'clone') continue;
        if (soureArr[i] && typeof soureArr[i] == "object") {
            clonedArr[i] = cloneArray(soureArr[i]);
        } else clonedArr[i] = soureArr[i]
    }
    return clonedArr;
};

/************************************************************************************
 *************************  end profilechart.js functions ***************************
 ************************************************************************************
 */
