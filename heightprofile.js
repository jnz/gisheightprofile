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
        new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject())
    });

    new Ext.Panel({
        title: "Elevation Profile",
        layout: 'border',
        renderTo: 'gxmap',
        //autoHeight: true,
        //autoWidth: true,
        height: 600,
        /*
         *tbar: new Ext.Toolbar({
         *    items: [{
         *        text: 'func1',
         *        handler: function () {
         *            alert('func1');
         *        }
         *    }, {
         *        text: 'func2',
         *        handler: function () {
         *            alert('func2');
         *        }
         *    }, ]
         *}),
         */
        items: [mapPanel],
    });

    //just a litte test (Paul)
    var length = new OpenLayers.Control.Measure(OpenLayers.Handler.Path, {
        eventListeners: {
            measure: function (evt) {
                alert("The length was " + evt.measure + evt.units);
            }
        }
    });

    var area = new OpenLayers.Control.Measure(OpenLayers.Handler.Polygon, {
        eventListeners: {
            measure: function (evt) {
                alert("The area was " + evt.measure + evt.units);
            }
        }
    });

    mapPanel.map.addControl(length);
    mapPanel.map.addControl(area);

    var toggleGroup = "measure controls";

    var lengthButton = new Ext.Button({
        text: 'Measure Length',
        enableToggle: true,
        toggleGroup: toggleGroup,
        toggleHandler: function toggleHandler(item, pressed) {
            if (pressed) {
                length.activate();
            } else {
                length.deactivate();
            }
        }
    });

    var areaButton = new Ext.Button({
        text: 'Measure Area',
        enableToggle: true,
        toggleGroup: toggleGroup,
        toggleHandler: function toggleHandler(item, pressed) {
            //Ext.Msg.alert('toggleHandler', 'toggle pressed');
            if (pressed) {
                area.activate();
            } else {
                area.deactivate();
            }
        }

    });

    mapPanel.getTopToolbar().addButton(lengthButton);
    mapPanel.getTopToolbar().addButton(areaButton);
});

