Ext.onReady(function () {
    var map = new OpenLayers.Map();
    var layer = new OpenLayers.Layer.WMS(
        "Global Imagery",
        "http://maps.opengeo.org/geowebcache/service/wms",
        {layers: "bluemarble"}
        );
    map.addLayer(layer);

    mapPanel = new GeoExt.MapPanel({
        map: map,
        region: 'center',
    });

   new Ext.Panel({
        title: "Elevation Profile",
        layout: 'border',
        renderTo: 'gxmap',
        height: 600,
        //width: 800,
        tbar: new Ext.Toolbar({
            items: [
                {text: 'func1', handler: function() { alert('func1'); } },
                {text: 'func2', handler: function() { alert('func2'); } },
            ]
        }),
        items: [mapPanel]
    });

});

