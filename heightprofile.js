var mapPanel;

Ext.onReady(function () {
    var map = new OpenLayers.Map();

    var gmap = new OpenLayers.Layer.Google("Google Streets",
                                           { numZoomLevels: 20 });
    var gphy = new OpenLayers.Layer.Google("Google Physical",
                                           { type: google.maps.MapTypeId.TERRAIN });
    var osm = new OpenLayers.Layer.OSM();
    var ghyb = new OpenLayers.Layer.Google("Google Hybrid",
        {
            type: google.maps.MapTypeId.HYBRID,
            numZoomLevels: 20
        }
        // used to be {type: G_HYBRID_MAP, numZoomLevels: 20}
    );
    var gsat = new OpenLayers.Layer.Google("Google Satellite", {
        type: google.maps.MapTypeId.SATELLITE,
        numZoomLevels: 22
    }
    // used to be {type: G_SATELLITE_MAP, numZoomLevels: 22}
    );

    map.addLayers([gmap, gphy, osm, ghyb, gsat]);
    map.addControl(new OpenLayers.Control.LayerSwitcher);

    mapPanel = new GeoExt.MapPanel({
        map: map,
        region: 'center',
        zoom: 6,
        tbar: new Ext.Toolbar(),
        center: new OpenLayers.LonLat(11.019287, 51.041394).transform(
        new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject()),
        items: [{
             xtype: "gx_zoomslider",
             vertical: true,
             height: 100,
             x: 15,
             y: 150,
             plugins: new GeoExt.ZoomSliderTip()
        }],
    });

    new Ext.Panel({
        title: "Elevation Profile",
        layout: 'fit',
        renderTo: 'gxmap',
        //autoWidth: true,
        height: 600,
        items: [mapPanel],
    });

    // Profile draw tool
    initProfileTool(mapPanel);
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
            strokeWidth: 3,
            strokeOpacity: 1,
            strokeColor: "#FF6611",
            strokeDashstyle: "dash"
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
    style.addRules([
            new OpenLayers.Rule({symbolizer: sketchSymbolizers})
            ]);
    var styleMap = new OpenLayers.StyleMap({"default": style});

    // add profile tool to the map panel
    var profileControl = new OpenLayers.Control.Measure(OpenLayers.Handler.Path, {
        eventListeners: {
            measure: function (evt) {
                onProfilePathComplete(evt);
            }
        },
        persist: true,
        handlerOptions: {
            layerOptions: { styleMap: styleMap },
        },
    });
    mapPanel.map.addControl(profileControl);

    var toggleGroup = "measure controls";
    var profileButton = new Ext.Button({
        text: 'Draw height profile',
        enableToggle: true,
        toggleGroup: toggleGroup,
        toggleHandler: function (item, pressed) {
            if (pressed) {
                profileControl.activate();
            } else {
                profileControl.deactivate();
            }
        }
    });
    mapPanel.getTopToolbar().addButton(profileButton);
}

/**
 * function: onProfilePathComplete(evt)
 * description: Gets called when the user has drawn a path with the profile line
 * tool. This function updates the profile chart accordingly.
 * parameters:
 * -    evt:    OpenLayers.Control.Measure "measure" event
 */
function onProfilePathComplete(evt)
{
    var pointCount = evt.geometry.components.length;
    var from;
    var to;
    var fromEllipsoidal;
    var toEllipsoidal;
    var azimuth;
    var directionString;
    var pathCollection = new Array();
    var srcProj = mapPanel.map.getProjectionObject();
    var wgs84 = new OpenLayers.Projection("EPSG:4326");

    for (var i = 1; i < pointCount; i++) {
        from = evt.geometry.components[i-1];
        to = evt.geometry.components[i];
        fromEllipsoidal = from.transform(srcProj, wgs84);
        toEllipsoidal = to.transform(srcProj, wgs84);
        azimuth = azimuthApprox(from.y, from.x, to.y, to.x); // use directly x,y
        directionString = directionStringFromAzimuth(azimuth); // N, NE, E, SW etc.
        pathCollection.push({
                                from: from,
                                to: to,
                                fromEllipsoidal: fromEllipsoidal, // store wgs84 lat, lon
                                toEllipsoidal: toEllipsoidal, // store wgs84 lat, lon
                                azimuth: azimuth,
                                directionString: directionString,
                            });
    }

    // now you can use pathCollection to update the graph
    // total length:
    // var geodesicLength = evt.geometry.getGeodesicLength(); // projected length in meter
}

