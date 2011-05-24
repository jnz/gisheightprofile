Ext4.require(['Ext4.data.*']);
Ext4.require(['Ext4.chart.*']);
Ext4.require(['Ext4.Window', 'Ext4.fx.target.Sprite', 'Ext4.layout.container.Fit']);

//declare global variables
var win;
var elevationChart;
var currentStoreData;
var minElevation;

/**
 * function: Ext4.onReady()
 * description: Initiation function for Extjs 4 Sandbox. It gets called when page is ready
 */
Ext4.onReady( function () {

	/**
	 * function: generateElevationSampleData()
	 * description: Function generates sample data, which can be visualized in chart
	 * return:  Mixed Array data: random data in an array. Fields: [index, elevation, lat, lon]
	 */
	window.generateElevationSampleData = function () {
		var data = [],
		i;
		var startLat= 9;
		var startLon= 40;

		for (i = 0; i < 200; i++) {
			data.push({
				index: i,
				elevation: Math.floor(Math.max((Math.random() * 1000))),
				lat: startLat,
				lon: startLon
			});
			startLat+=0.1;
			startLon+=0.1;
		}
		return data;
	};
	/**
	 * function: generateElevationDataFromResults(Array results)
	 * description: Function parses result-array from elevation service and puts result data into return-array.
	 * Return-array acts as data for JSON-Store --> chart-data
	 * parameters:
	 * -    results:    array returned from elevation-service
	 * return:  Array data: array for chart-data. Fields: [index, elevation, lat, lon]
	 */
	window.generateElevationDataFromResults = function (results) {
		var data = [];

		for (var i = 0; i < results.length; i++) {

			if (results[i].breakPoint) {

				data.push({
					index: i,
					elevation: results[i].elevation,
					lat: results[i].lat,
					lon: results[i].lon,
					markerElevation:results[i].elevation,
					direction: results[i].breakPoint.directionString
				});
			} else {
				data.push({
					index: i,
					elevation: results[i].elevation,
					lat: results[i].lat,
					lon: results[i].lon
				});
			}

		}
		currentStoreData=data;
		return data;
	};
	//create JsonStore = base data for chart
	window.elevationStore=Ext4.create('Ext4.data.JsonStore', {
		proxy: {
			type: 'localstorage',
			id  : 'localStore'
		},
		fields: ['index','elevation','lat', 'lon','markerElevation','direction','markerElevationIndex','markerNo'],
		data: generateElevationSampleData()
	});

	//configuration for height multiplicator slider-label
	var sliderLabel= {
		xtype:'label',
		region:'north',
		height:30,
		style: {
			padding:5
		},
		text: 'Height multiplicator:'
	}

	/**
	 * function: createHeightStartValueField(Number min)
	 * description: configuration function for starting y-value. Minimum-value and value gets passed.
	 * function gets called while creating profile window.
	 * parameters:
	 * -    min:    minimum value as number (lowest value from data)
	 * return:  configuration for y-value numberfield
	 */
	function createHeightStartValueField(min) {
		return {
			xtype: 'numberfield',
			id: 'yStartValueTxt',
			fieldLabel: 'Y-Start-Wert',
			labelAlign:'top',
			value: min,
			maxValue: 9999,
			minValue: min,
			region:'south',
			height:40,
			disableKeyFilter:true,
			keyNavEnabled: true,
			border:true,
			decimalSeparator:',',
			decimalPrecision:0,
			editable:true,
			listeners: {
				change: {
					fn: function(obj, newVal, oldVal) {
						Ext4.getCmp('chartContainer').removeAll();
						//TODO add slider value for majorTick
						createElevationChart(newVal);
						elevationStore.loadData(currentStoreData);
					}
				}
			}

		};
	}

	//TODO handler for slider changes tick size
	//configuration for height multiplicator slider. Slider redraws chart with new majorTickSize
	var heightSlider= {
		id:'heightSlider',
		xtype: 'slider',
		region:'center',
		vertical:true,
		value: 1,
		style: {
			margin:10
		},
		increment: 1,
		minValue: 1,
		maxValue: 10
	}

	/**
	 * function: createElevationChart(Number min)
	 * description: function creates configuration for elevation-chart and adds it to 'chartContainer' in profile window.
	 * The minimum value for y-axis gets passed. Function gets called when main profile window gets created
	 * and when yStartValue-numberfield value changes.
	 * parameters:
	 * -    min:    minimum value sets min-value of y-axis in chart.
	 */
	function createElevationChart(min) {
		elevationChart= {
			id:'elevationChart',
			xtype: 'chart',
			animate: false,
			store: elevationStore,
			shadow: false,
			theme: 'Blue',
			axes: [{
				type: 'Numeric',
				id:'yValAxis',
				xtype: 'Axis',
				minimum: min,
				adjustMinimumByMajorUnit:false,
				decimals:0,
				position: 'left',
				//majorTickSteps:5,
				fields: ['elevation'],
				title: 'Height in m',
				minorTickSteps: 1,
				grid: {
					odd: {
						opacity: 1,
						fill: '#ddd',
						stroke: '#bbb',
						'stroke-width': 0.5
					}
				}
			}
			,{
				type: 'Numeric',
				position: 'bottom',
				fields: ['index'],
				title: 'Marker'
			}
			],
			series: [{
				type: 'area',
				highlight:true,
				axis: 'left',
				grid:true,
				smooth: false,
				field:'index',
				style: {
					opacity: 0.7
				},
				xField: 'index',
				yField: 'markerElevation',
				tips: {
					trackMouse: true,
					width: 150,
					height: 50,
					renderer: function(storeItem, item) {
						//cut digits
						var elevation=Math.floor(storeItem.get('elevation'));

						//set number of digits for coordinates
						var digits=7;
						var lat=storeItem.get('lat');

						//set digit number, convert to string and replace "." with ","
						lat=(Math.floor(lat*Math.pow(10,digits))/Math.pow(10,digits)+'').replace(".",",");
						var lon=storeItem.get('lon');
						lon=(Math.floor(lon*Math.pow(10,digits))/Math.pow(10,digits)+'').replace(".",",");

						//tooltip text
						this.setTitle('Height: ' + elevation + ' m <br> Latitude: '+ lat + '<br> Longitude: '+ lon);
					}
				},
			},{
				type: 'scatter',
				highlight:false,
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
						//convert via ascii code to char
						return String.fromCharCode(n+65);
					},
					'text-anchor': 'middle',
					contrast: false
				},

				xField: 'index',
				yField: 'markerElevation',
				tips: {
					trackMouse: true,
					width: 100,
					height: 40,
					renderer: function(storeItem, item) {
						//tooltip text
						this.setTitle('Marker: ' + storeItem.get('markerNo') + '<br> Direction: '+ storeItem.get('direction'));
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
		minElevation=Math.floor(elevationStore.min('elevation'));

		//create window component
		win = Ext4.createWidget('window', {
			id: 'chartWindow',
			width: 700,
			height: 400,
			x: 100,
			y: 100,
			style: 'border: 1px solid #666',
			hidden: false,
			maximizable: true,
			title: 'Height Profile',
			renderTo: Ext4.getBody(),
			layout: 'fit',
			tbar: [{
				text: 'Reload Data',
				handler: function () {
					elevationStore.loadData(generateElevationSampleData());
				}
			}],
			items:[{
				xtype:'panel',
				style: 'border: 1px solid #666',
				layout: {
					type: 'hbox',
					align: 'stretch'
				},
				items:[{
					xtype: 'panel',
					flex: 1,
					border:true,
					height:100,
					minWidth:100,
					layout: 'border',
					items:[heightSlider,sliderLabel,createHeightStartValueField(minElevation)]
				}
				,{
					xtype: 'container',
					id: 'chartContainer',
					flex: 8,
					border: true,
					height: 450,
					layout: {
						type: 'fit'
					},
					items:[]//leave item empty, because it gets generated and added through createElevationChart()-function
				}]
			}	]

		});
		createElevationChart(minElevation);
	}
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
	 * function: drawChart(elevationArray, pathCollection)
	 * description: Function generates data for JsonStore from result of elevation service
	 * and loads it into elevationStore. After doing this, chart gets redrawn with new data.
	 * parameters:
	 * -    elevationArray:    return array from elevation service. Fields:
	 * 								elevation
	 *								latitude
	 * 								longitude
	 * 								breakPoint = null // if not a breakpoint
	 * 								breakPoint.azimuth // [rad]
	 * 								breakPoint.directionString // N, E, SW, etc.
	 * 								breakPoint.index // segment index
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
		elevationStore.loadData(generateElevationDataFromResults(elevationArray));
	}
});