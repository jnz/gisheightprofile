var mapPanel = null;        // Global GeoExt.MapPanel object.
var initViewLat = 51.0;     // initial map center
var initViewLon = 8.0;
var initZoomLevel = 6;
Ext.onReady( function() {
	// Init i18n settings
	setLocale(GeoExt.Lang.locale);

	var map = new OpenLayers.Map({
		allOverlays : true,
		projection  : new OpenLayers.Projection("EPSG:900913"), // google web mercator projection
		controls    : [ new OpenLayers.Control.Navigation(),
		new OpenLayers.Control.PanZoomBar(),
		new OpenLayers.Control.LayerSwitcher(),
		new OpenLayers.Control.OverviewMap({
			maximized: true,
			autoPan: false
		}),
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
	initViewPos = new OpenLayers.LonLat(this.initViewLon, this.initViewLat);
	initViewPos.transform(wgs84proj, mapproj);

	// Use a ful screen layout
	new Ext.Viewport({
		layout: "fit",
		items: [{
			region : "center",
			id     : "mappanel",
			title  : getI18Nstr("mapcaption", "Map"),
			xtype  : "gx_mappanel",
			zoom   : initZoomLevel,
			center : initViewPos,
			map    : map,
			tbar   : new Ext.Toolbar()
		}]
	});
	mapPanel = Ext.getCmp("mappanel");

	//create ElevatioProfileTool GeoExt-ux-extension
	//pass map and heightprovider("google" or "mapquest")
	var elevationProfileTool = new GeoExt.ux.ElevationProfileTool({
		map:map,
		heightProvider:'google'

	});
	mapPanel.getTopToolbar().add(elevationProfileTool);

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