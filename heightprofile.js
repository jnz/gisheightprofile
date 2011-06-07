var mapPanel = null;        // Global GeoExt.MapPanel object.
var initViewLat = 51.0;     // initial map center
var initViewLon = 8.0;
var initZoomLevel = 6;
// When drawing the geodetic line, every GEODETIC_LINE_SMOOTHERth point is used.
// GEODETIC_LINE_SMOOTHER = 1 would be a very smooth curve (but slow in drawing).
// GEODETIC_LINE_SMOOTHER = 20 would be a edged curve (but fast in drawing).
var GEODETIC_LINE_SMOOTHER = 10;

/**
 * function: Ext.onReady()
 * description: Gets called by the ExtJS3 framework when the page is ready.
 */
Ext.onReady(function() {
    // Init i18n settings
    setLocale(GeoExt.Lang.locale);

    var map = new OpenLayers.Map({
        allOverlays : true,
        projection  : new OpenLayers.Projection("EPSG:900913"), // google web mercator projection
        controls    : [ new OpenLayers.Control.Navigation(),
                        new OpenLayers.Control.PanZoomBar(),
                        new OpenLayers.Control.LayerSwitcher(),
                        new OpenLayers.Control.OverviewMap({ maximized: true, autoPan: false}),
                      ],
        units       : "m"
    });

    // This is our initial base layer
    var gphy = new OpenLayers.Layer.Google(getI18Nstr("googlephysical", "Google Physical"), {
        type: google.maps.MapTypeId.TERRAIN,
    });
    map.addLayer(gphy);

    // transform initial WGS84 coordinates to the current map projection
    var wgs84proj = new OpenLayers.Projection("EPSG:4326");
    var mapproj = map.getProjectionObject();
    initViewPos = new OpenLayers.LonLat(initViewLon, initViewLat);
    initViewPos.transform(wgs84proj, mapproj);

    // Marker layer
    var markerLayer = new OpenLayers.Layer.Markers("Markers", {
        displayInLayerSwitcher : false
    });
    map.addLayer(markerLayer);

    // Profile line layer
    var renderer = OpenLayers.Util.getParameters(window.location.href).renderer;
    renderer = (renderer) ? [renderer] : OpenLayers.Layer.Vector.prototype.renderers;
    var layer_style = OpenLayers.Util.extend({}, OpenLayers.Feature.Vector.style['default']);
    layer_style.fillOpacity = 0.2;
    layer_style.graphicOpacity = 1;
    var vectorLayer = new OpenLayers.Layer.Vector("Path", {
        style                  : layer_style,
        renderers              : renderer,
        displayInLayerSwitcher : false
    });
    map.addLayer(vectorLayer);

    // Use a ful screen layout
    new Ext.Viewport({
        layout: "fit",
        items: [
        {
            region : "center",
            id     : "mappanel",
            title  : getI18Nstr("mapcaption", "Map"),
            xtype  : "gx_mappanel",
            tbar   : new Ext.Toolbar(),
            zoom   : initZoomLevel,
            center : initViewPos,
            map    : map,
        }]
    });
    mapPanel = Ext.getCmp("mappanel");

    //Init height profile button
    initProfileTool(mapPanel);

    //Add geocoder search text box
    var geoNameSearchCombo = new GeoExt.ux.GeoNamesSearchCombo({
       map  : map,
       zoom : 12
    });
    mapPanel.getTopToolbar().addFill(); // right align the search box
    mapPanel.getTopToolbar().add(geoNameSearchCombo);

    var gmap = new OpenLayers.Layer.Google(getI18Nstr("googlestreets", "Google Streets"), {
        numZoomLevels: 20,
        visibility: false
    });
    map.addLayer(gmap);

    var osm = new OpenLayers.Layer.OSM(getI18Nstr("osm", "Open Street Maps"));
    osm.setVisibility(false);
    map.addLayer(osm);

    var gsat = new OpenLayers.Layer.Google(getI18Nstr("googlesat", "Google Satellite"), {
        type: google.maps.MapTypeId.SATELLITE,
        numZoomLevels: 22,
        visibility: false
    });
    map.addLayer(gsat);
});

/**
 * function: initProfileTool()
 * description: Initialize functions to measure a profile on the map. This
 * function will add a button to the map panel.
 * data.
 * parameters:
 * -    mapPanel:    GeoExt.MapPanel
 */
function initProfileTool(mapPanel)
{
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
    style.addRules([new OpenLayers.Rule({symbolizer: sketchSymbolizers})]);
    var styleMap = new OpenLayers.StyleMap({"default": style});

    // add profile tool to the map panel
    var profileControl = new OpenLayers.Control.Measure(OpenLayers.Handler.Path, {
        eventListeners: {
            measure: function (evt) {
                onProfilePathComplete(evt);
            },
            measurepartial: function(evt) {
                onProfilePathPartial(evt);
            }
        },
        persist: false,
        handlerOptions: {
            maxVertices    : 26, // we are running out of characters after 26
            freehandToggle : '',
            layerOptions   : { styleMap: styleMap }
        }
    });
    mapPanel.map.addControl(profileControl);

    var toggleGroup = "measure controls";
    var profileButton = new Ext.Button({
        text          : getI18Nstr("profiletool", "Height Profile Tool"),
        enableToggle  : true,
        toggleGroup   : toggleGroup,
        toggleHandler : function (item, pressed) {
                            clearAllMarkers();
                            if (pressed) {
                                profileControl.activate();
                            } else {
                                profileControl.deactivate();
                            }
                        }
    });
    profileButton.setIcon('img/map_edit.png');
    mapPanel.getTopToolbar().addButton(profileButton);
}

/**
 * function: onProfilePathComplete(evt)
 * description: Gets called when the user has drawn a path with the profile line
 * tool. This function prepares an array (segmentArray) which contains
 * all the informations of the drawn line segments (coordinates, length, azimuth
 * etc.)
 * parameters:
 * -    evt:    OpenLayers.Control.Measure "measure" event
 */
function onProfilePathComplete(evt)
{
    var i;
    var pointCount = evt.geometry.components.length;
    var from; // OpenLayers Point
    var to;  // OpenLayers Point
    var fromEllipsoidal; // x, y
    var toEllipsoidal; // x, y
    var fromLonLat; // lon, lat (OpenLayer.LonLat object) in [deg]
    var toLonLat; // lon, lat (OpenLayer.LonLat object) in [deg]
    var segmentLength; // [km]
    var totalLength = 0; // [km]
    var azimuth; // azimuth in [rad]
    var directionString; // direction of the segment: N, NE, E, SE, S a.s.o
    var segmentArray = []; // collect all the segments in this array
    var srcProj = mapPanel.map.getProjectionObject(); // current map projection
    var wgs84 = new OpenLayers.Projection("EPSG:4326"); // let's store wgs84 coordinates

    // Let's remove the older markers first
    clearAllMarkers();
    // Add first marker:
    addMarkerToMap(evt.geometry.components[0].x,
                   evt.geometry.components[0].y, 0);
    for (i = 1; i < pointCount; i++) {
        from            = evt.geometry.components[i-1];
        to              = evt.geometry.components[i];
        fromEllipsoidal = from.clone().transform(srcProj, wgs84); // transform to wgs84
        toEllipsoidal   = to.clone().transform(srcProj, wgs84);
        fromLonLat      = new OpenLayers.LonLat(fromEllipsoidal.x, fromEllipsoidal.y);
        toLonLat        = new OpenLayers.LonLat(toEllipsoidal.x, toEllipsoidal.y);
        segmentLength   = OpenLayers.Util.distVincenty(fromLonLat, toLonLat);
        azimuth         = azimuthApprox(from.y, from.x, to.y, to.x); // use directly x,y
        directionString = directionStringFromAzimuth(azimuth); // N, NE, E, SW etc.

        segmentArray.push({ from            : from,
                            to              : to,
                            fromLonLat      : fromLonLat,
                            toLonLat        : toLonLat,
                            segmentLength   : segmentLength,
                            azimuth         : azimuth,
                            directionString : directionString,
                            cumulativeLength: totalLength
                          });

        totalLength += segmentLength;
        addMarkerToMap(to.x, to.y, i);
    }

    // now you can use segmentArray to update the graph
    // total length:
    // console.log('Profile line on map:');
    // console.log('Total length [km]: ' + totalLength);
    // console.log('Line segments: ' + String(pointCount-1));
    // for (i = 0; i < segmentArray.length; i++) {
    //     console.log('Segment:');
    //     console.log('  From [WGS84, deg]: ' +
    //                    segmentArray[i].fromLonLat.lon +
    //                    ' ' +
    //                    segmentArray[i].fromLonLat.lat);
    //     console.log('  To [WGS84, deg]: ' +
    //                    segmentArray[i].toLonLat.lon +
    //                    ' ' +
    //                    segmentArray[i].toLonLat.lat);
    //     console.log('  Segment length [km]: ' + segmentArray[i].segmentLength);
    //     console.log('  Azimuth [deg]: ' + segmentArray[i].azimuth*180/Math.PI);
    //     console.log('  Direction: ' + segmentArray[i].directionString);
    // }
    // console.log('');

    var pathCollection = {
        segmentArray : segmentArray,
        totalLength  : totalLength
    };
    getHeightAlongPath(pathCollection, function(resultsArray, pathCollection)
                                       {
                                           if(resultsArray == null)
                                           {
                                               return;
                                           }
                                           drawHeightPath(resultsArray, pathCollection);
                                           window.closeProfileWindow();
                                           drawChart(resultsArray, pathCollection);
                                           window.createProfileWindow();
                                       });
}

function onProfilePathPartial(evt)
{
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
function drawHeightPath(resultsArray, pathCollection)
{
    var vectorLayerArray = mapPanel.map.getLayersByName("Path");
    if (vectorLayerArray.length != 1) {
        console.log('No path layer found');
        return;
    }
    var vectorLayer = vectorLayerArray[0];
    vectorLayer.destroyFeatures();

    var style_line = {
        strokeColor     : "#FF1111",
        strokeWidth     : 6,
        strokeDashstyle : "solid",
        strokeOpacity   : 0.4,
        pointRadius     : 6,
        pointerEvents   : "visiblePainted"
    };

    // convert wgs84 input from function arguments to current system
    var nativeProj  = mapPanel.map.getProjectionObject();
    var wgs84       = new OpenLayers.Projection("EPSG:4326");
    var pWGS84;

    // create a line feature from a list of points
    var pointList = [];
    for(var i=0; i<resultsArray.length; i++) {
        // we only draw every GEODETIC_LINE_SMOOTHERth point if it is not a breakpoint
        if(i % GEODETIC_LINE_SMOOTHER == 0 || resultsArray[i].breakPoint != null) {
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
function addMarkerToMap(x, y, markerIndex)
{
    var markerLayerArray = mapPanel.map.getLayersByName("Markers");
    if (markerLayerArray.length != 1) {
        console.log('No marker layer found');
        return;
    }
    var markerLayer = markerLayerArray[0];

    // convert to a character from A-Z
    markerIndex = Math.min(markerIndex, 25);
    var markerLetter = String.fromCharCode(65+markerIndex);

    var iconURL = "img/red_Marker" + markerLetter + ".png";
    var size    = new OpenLayers.Size(20,34);
    var offset  = new OpenLayers.Pixel(-(size.w/2), -size.h);
    var icon    = new OpenLayers.Icon(iconURL, size, offset);
    markerLayer.addMarker(new OpenLayers.Marker(new OpenLayers.LonLat(x, y),
                          icon));
}

/**
 * function: clearAllMarkers()
 * description: Remove all markers from the marker layer
 * and remove all drawings from the path vector layer.
 */
function clearAllMarkers()
{
    var i;
    var markerLayerArray = mapPanel.map.getLayersByName("Markers");
    if (markerLayerArray.length != 1) {
        return;
    }
    var markerLayer = markerLayerArray[0];
    var markerArray = markerLayer.markers;

    for (i = 0; i < markerArray.length; i++) {
        markerArray[i].destroy();
    }
    markerLayer.clearMarkers();
}

/**
 * function: setMoveableMarker(lat, lon)
 * description: Set the moveable marker to a position
 * parameters:
 * -    lat       : Longitude of the new marker (WGS84)
 * -    lon       : Latitude of the new marker (WGS84)
 */
function setMoveableMarker(lat, lon)
{
    var i;
    var markerLayerArray = mapPanel.map.getLayersByName("Markers");
    if (markerLayerArray.length != 1) {
        return;
    }
    var markerLayer = markerLayerArray[0];
    var markerArray = markerLayer.markers;

     // convert wgs84 input from function arguments to current system
    var nativeProj  = mapPanel.map.getProjectionObject();
    var wgs84       = new OpenLayers.Projection("EPSG:4326");
    var pWGS84      = new OpenLayers.LonLat(lon, lat);
    var pNative     = pWGS84.clone().transform(wgs84, nativeProj);

    // if we already have a moveable marker, just update the position
    for (i = 0; i < markerArray.length; i++) {
        if (markerArray[i].isMoveableMarker == true) {
            var px = mapPanel.map.getLayerPxFromLonLat(pNative);
            markerArray[i].moveTo(px);
            markerArray[i].display(true);
            return;
        }
    }

    // We have not found our moveable marker layer, so we create it.
    // This is a sort of lazy loading.
    var iconURL = "img/blue_Marker.png";
    var size    = new OpenLayers.Size(20,34);
    var offset  = new OpenLayers.Pixel(-(size.w/2), -size.h);
    var icon    = new OpenLayers.Icon(iconURL, size, offset);
    var marker  = new OpenLayers.Marker(pNative, icon)
    marker.isMoveableMarker = true;
    markerLayer.addMarker(marker);
}

function clearMoveableMarker()
{
    var markerLayerArray = mapPanel.map.getLayersByName("Markers");
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

