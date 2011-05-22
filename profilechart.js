Ext4.require(['Ext4.data.*']);
Ext4.require(['Ext4.chart.*']);
Ext4.require(['Ext4.Window', 'Ext4.fx.target.Sprite', 'Ext4.layout.container.Fit']);
var win;
var elevationChart;
var currentStoreData;
var minElevation;
Ext4.onReady( function () {

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
	window.generateElevationDataFromResults = function (results) {
		var data = [];

		for (var i = 0; i < results.length; i++) {
			data.push({
				index: i,
				elevation: results[i].elevation,
				lat: results[i].lat,
				lon: results[i].lon
			});
		}
		currentStoreData=data;
		return data;
	};
	window.elevationStore=Ext4.create('Ext4.data.JsonStore', {
		proxy: {
			type: 'localstorage',
			id  : 'localStore'
		},
		fields: ['index','elevation','lat', 'lon'],
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

	//configuration for starting y-value
	function createHeightStartValueField(min) {
		return {
			xtype: 'numberfield',
			id: 'yStartValueTxt',
			fieldLabel: 'Y-Start-Wert',
			labelAlign:'top',
			value: min,
			maxValue: 999,
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

	//configuration for height multiplicator slider
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

	function createElevationChart(min) {
		elevationChart= {
			id:'elevationChart',
			xtype: 'chart',
			style: 'background:#fff',
			animate: false,
			store: elevationStore,
			shadow: true,
			theme: 'Blue',
			//legend: {
			//	position: 'right'
			//},
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
				yField: 'elevation',
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
				showMarkers: false
			}]
		};
		Ext4.getCmp('chartContainer').add(elevationChart);
	}

	window.createProfileWindow = function () {

		minElevation=Math.floor(elevationStore.min('elevation'));

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
					items:[]
				}]
			}	]

		});
		createElevationChart(minElevation);
	}
	window.closeProfileWindow = function () {
		if (win != undefined) {
			win.destroy();
		}
	}
	window.drawChart = function (elevationArray, pathCollection) {
		elevationStore.loadData(generateElevationDataFromResults(elevationArray));
	}
});