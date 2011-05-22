Ext4.require(['Ext4.data.*']);
Ext4.require(['Ext4.chart.*']);
Ext4.require(['Ext4.Window', 'Ext4.fx.target.Sprite', 'Ext4.layout.container.Fit']);
var win;
Ext4.onReady( function () {

	window.generateElevationSampleData = function () {
		var data = [],
		i;
		var startLat= 9;
		var startLon= 40;

		for (i = 0; i < 50; i++) {
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

		return data;
	};
	window.elevationStore=Ext4.create('Ext4.data.JsonStore', {
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
	var heightStartValueField= {
		xtype: 'numberfield',
		id: 'yStartValueTxt',
		fieldLabel: 'Y-Start-Wert',
		labelAlign:'top',
		value: 0,
		maxValue: 999,
		minValue: 0,
		region:'south',
		height:40,
		border:true

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
	//configuration for elevationChart
	var elevationChart= {
		id:'elevationChart',
		xtype: 'chart',
		style: 'background:#fff',
		animate: true,
		store: elevationStore,
		shadow: true,
		theme: 'Blue',
		//legend: {
		//	position: 'right'
		//},
		axes: [{
			type: 'Numeric',
			minimum: 0,
			position: 'left',
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
			highlight:true,
			smooth: false,
			style: {
				opacity: 0.7
			},
			xField: 'id',
			yField: 'elevation',
			tips: {
				trackMouse: true,
				width: 150,
				height: 50,
				renderer: function(storeItem, item) {
					var digits=7;
					var elevation=Math.floor(storeItem.get('elevation'));
					var lat=storeItem.get('lat');
					lat=Math.floor(lat*Math.pow(10,digits))/Math.pow(10,digits);
					var lon=storeItem.get('lon');
					lon=Math.floor(lon*Math.pow(10,digits))/Math.pow(10,digits);

					this.setTitle('Height: ' + elevation + ' m <br> Latitude: '+ lat + '<br> Longitude: '+ lon);
				}
			},
			showMarkers: false
		}]
	}

	window.createProfileWindow = function () {
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
					items:[heightSlider,sliderLabel,heightStartValueField]
				}
				,{
					xtype: 'container',
					flex: 8,
					border: true,
					height: 450,
					layout: {
						type: 'fit'
					},
					items:[elevationChart]
				}]
			}	]

		});
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
