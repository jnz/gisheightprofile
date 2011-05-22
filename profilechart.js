Ext4.require(['Ext4.data.*']);
Ext4.require(['Ext4.chart.*']);
Ext4.require(['Ext4.Window', 'Ext4.fx.target.Sprite', 'Ext4.layout.container.Fit']);
var win;
Ext4.onReady( function () {

	window.generateData = function (n, floor) {
		var data = [],
		p = (Math.random() * 11) + 1,
		i;

		floor = (!floor && floor !== 0) ? 20 : floor;

		for (i = 0; i < (n || 12); i++) {
			data.push({
				name: Ext4.Date.monthNames[i % 12],
				data1: Math.floor(Math.max((Math.random() * 100), floor)),
				data2: Math.floor(Math.max((Math.random() * 100), floor)),
				data3: Math.floor(Math.max((Math.random() * 100), floor)),
				data4: Math.floor(Math.max((Math.random() * 100), floor)),
				data5: Math.floor(Math.max((Math.random() * 100), floor)),
				data6: Math.floor(Math.max((Math.random() * 100), floor)),
				data7: Math.floor(Math.max((Math.random() * 100), floor)),
				data8: Math.floor(Math.max((Math.random() * 100), floor)),
				data9: Math.floor(Math.max((Math.random() * 100), floor))
			});
		}
		return data;
	};
	window.generateHeightSampleData = function () {
		var data = [],
		i;

		var startLat= 9;
		var startLon= 40;

		for (i = 0; i < 50; i++) {
			data.push({
				index: i,
				height: Math.floor(Math.max((Math.random() * 1000))),
				lat: startLat,
				lon: startLon
			});
			startLat+=0.1;
			startLon+=0.1;
		}
		return data;
	};
	window.generateHeightDataFromResults = function (results) {
		var data = [];

		for (var i = 0; i < results.length; i++) {
			data.push({
				index: i,
				height: results[i].elevation,
				lat: results[i].location.Ja,
				lon: results[i].location.Ka

			});
		}

		return data;
	};
	window.store1 = Ext4.create('Ext4.data.JsonStore', {
		fields: ['name', 'data1', 'data2', 'data3', 'data4', 'data5', 'data6', 'data7', 'data9', 'data9'],
		data: generateData()
	});

	window.heightStore=Ext4.create('Ext4.data.JsonStore', {
		fields: ['index','height','lat', 'lon'],
		data: generateHeightSampleData()
	});

	var sliderLabel= {
		xtype:'label',
		region:'north',
		height:30,
		style: {
			padding:5
		},
		text: 'Height multiplicator:'
	}
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

	var heightSlider= {
		id:'heightSlider',
		xtype: 'slider',
		region:'center',
		//labelAlign:'top',
		//fieldLabel:'Abstände',
		vertical:true,
		value: 1,
		style: {
			margin:10

		},
		increment: 1,
		minValue: 1,
		maxValue: 10
	}

	var elevationChart= {
		id:'elevationChart',
		xtype: 'chart',
		style: 'background:#fff',
		animate: true,
		store: heightStore,
		shadow: true,
		theme: 'Sky',
		//legend: {
		//	position: 'right'
		//},
		axes: [{
			type: 'Numeric',
			minimum: 0,
			position: 'left',
			fields: ['height'],
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
		/*,{
		 type: 'Category',
		 position: 'bottom',
		 fields: ['index'],
		 title: 'Path'
		 }*/
		],
		series: [{
			type: 'line',
			highlight: {
				size: 7,
				radius: 7
			},
			axis: 'left',
			grid:true,
			highlight:true,
			smooth: false,
			xField: 'name',
			yField: 'height',
			showMarkers: false
			/*markerConfig: {

			 type: 'cross',
			 size: 4,
			 radius: 4,
			 'stroke-width': 0
			 }*/
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
					heightStore.loadData(generateHeightSampleData());
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
					//width: 400,
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
	window.drawChart = function (elevationArray) {
		heightStore.loadData(generateHeightDataFromResults(elevationArray));
	}
});