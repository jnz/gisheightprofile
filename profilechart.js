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
	window.generateDataNegative = function (n, floor) {
		var data = [],
		p = (Math.random() * 11) + 1,
		i;

		floor = (!floor && floor !== 0) ? 20 : floor;

		for (i = 0; i < (n || 12); i++) {
			data.push({
				name: Ext4.Date.monthNames[i % 12],
				data1: Math.floor(((Math.random() - 0.5) * 100), floor),
				data2: Math.floor(((Math.random() - 0.5) * 100), floor),
				data3: Math.floor(((Math.random() - 0.5) * 100), floor),
				data4: Math.floor(((Math.random() - 0.5) * 100), floor),
				data5: Math.floor(((Math.random() - 0.5) * 100), floor),
				data6: Math.floor(((Math.random() - 0.5) * 100), floor),
				data7: Math.floor(((Math.random() - 0.5) * 100), floor),
				data8: Math.floor(((Math.random() - 0.5) * 100), floor),
				data9: Math.floor(((Math.random() - 0.5) * 100), floor)
			});
		}
		return data;
	};
	window.store1 = Ext4.create('Ext4.data.JsonStore', {
		fields: ['name', 'data1', 'data2', 'data3', 'data4', 'data5', 'data6', 'data7', 'data9', 'data9'],
		data: generateData()
	});
	window.storeNegatives = Ext4.create('Ext4.data.JsonStore', {
		fields: ['name', 'data1', 'data2', 'data3', 'data4', 'data5', 'data6', 'data7', 'data9', 'data9'],
		data: generateDataNegative()
	});
	window.store3 = Ext4.create('Ext4.data.JsonStore', {
		fields: ['name', 'data1', 'data2', 'data3', 'data4', 'data5', 'data6', 'data7', 'data9', 'data9'],
		data: generateData()
	});
	window.store4 = Ext4.create('Ext4.data.JsonStore', {
		fields: ['name', 'data1', 'data2', 'data3', 'data4', 'data5', 'data6', 'data7', 'data9', 'data9'],
		data: generateData()
	});
	window.store5 = Ext4.create('Ext4.data.JsonStore', {
		fields: ['name', 'data1', 'data2', 'data3', 'data4', 'data5', 'data6', 'data7', 'data9', 'data9'],
		data: generateData()
	});
	store1.loadData(generateData(8));
	
	var sliderLabelConfig={
		xtype:'label',
		region:'north',
		height:30,
		style: {
			padding:5
		},
		text: 'Height multiplicator:'
	}
	var heightStartValueConfig={
		xtype: 'numberfield',
        id: 'yStartValueTxt',
        fieldLabel: 'Y-Start-Wert',
        labelAlign:'top',
        value: 0,
        maxValue: 999,
        minValue: 0,
		region:'south',
		height:40,
		border:true,
		frame:true
		
	}
	
	var sliderConfig= {
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

	var elevationChartConfig= {
		id:'elevationChart',
		xtype: 'chart',
		style: 'background:#fff',
		animate: true,
		store: store1,
		shadow: true,
		theme: 'Category1',
		legend: {
			position: 'right'
		},
		axes: [{
			type: 'Numeric',
			minimum: 0,
			position: 'left',
			fields: ['data1', 'data2', 'data3'],
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
		},{
			type: 'Category',
			position: 'bottom',
			fields: ['name'],
			title: 'Path'
		}],
		series: [{
			type: 'line',
			highlight: {
				size: 7,
				radius: 7
			},
			axis: 'left',
			xField: 'name',
			yField: 'data1',
			markerConfig: {
				type: 'cross',
				size: 4,
				radius: 4,
				'stroke-width': 0
			}
		},{
			type: 'line',
			highlight: {
				size: 7,
				radius: 7
			},
			axis: 'left',
			smooth: true,
			xField: 'name',
			yField: 'data2',
			markerConfig: {
				type: 'circle',
				size: 4,
				radius: 4,
				'stroke-width': 0
			}
		},{
			type: 'line',
			highlight: {
				size: 7,
				radius: 7
			},
			axis: 'left',
			smooth: true,
			fill: true,
			xField: 'name',
			yField: 'data3',
			markerConfig: {
				type: 'circle',
				size: 4,
				radius: 4,
				'stroke-width': 0
			}

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
					store1.loadData(generateData(100));
				}
			}],
			items:[{
				frame:true,
				xtype:'panel',
				style: 'border: 1px solid #666',
				layout: {
					type: 'hbox',
					align: 'stretch'
				},
				items:[{
					xtype: 'panel',
					flex: 1,
					frame:true,
					border:true,
					height:100,
					minWidth:100,
					layout: 'border',
					items:[sliderConfig,sliderLabelConfig,heightStartValueConfig]
				}
				,{
					xtype: 'container',
					flex: 8,
					frame:true,
					border: true,
					height: 450,
					//width: 400,
					layout: {
						type: 'fit'
					},
					items:[elevationChartConfig]
				}]
			}	]

		});
	}
	window.closeProfileWindow = function () {
		if (win != undefined) {
			win.destroy();
		}
	}
});