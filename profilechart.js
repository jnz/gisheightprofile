Ext4.require(['Ext4.data.*']);
Ext4.require(['Ext4.chart.*']);
Ext4.require(['Ext4.Window', 'Ext4.fx.target.Sprite', 'Ext4.layout.container.Fit']);

//declare global variables
var win;
var elevationChart;
var currentStoreData=[];	//current elevation data
var minElevation;	//minimum elavation on y-axis
var maxElevation;	//maximum elevation on y-axis
var totalLength;	//length of path
var currentMaxElevation; //needed to store current maximum elevation. if you change minimum y value, this value is taken as maximum
var maxVertExag;	//value gets calculated each time window gets resized or redrawn

/**
 * function: Ext4.onReady()
 * description: Initiation function for Extjs 4 Sandbox. It gets called when page is ready
 */
Ext4.onReady( function () {

	//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
	//+++++++++++++++++++++++++++++++ STORES ++++++++++++++++++++++++++++++++++++++++++++++++++++++
	//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
	//JsonStore = base data for elevation
	window.elevationStore=Ext4.create('Ext4.data.JsonStore', {
		proxy: {
			type: 'localstorage',
			id  : 'localStore'
		},
		fields: ['index','elevation','lat', 'lon','markerElevation','direction','markerNo','markerIndex','xAxisLength','displayElevation']
	});

	//store for vertical Exaggeration combobox
	var vertExagStore = Ext4.create('Ext4.data.Store', {
		fields: ['dispVal', 'value'],
		autoLoad:true,
		data : [{
			"dispVal":"0.25",
			"value":0.25
		},{
			"dispVal":"0.5",
			"value":0.5
		},{
			"dispVal":"1",
			"value":1
		},{
			"dispVal":"2",
			"value":2
		},{
			"dispVal":"2.5",
			"value":2.5
		},{
			"dispVal":"5",
			"value":5
		},{
			"dispVal":"10",
			"value":10
		},{
			"dispVal":"20",
			"value":20
		},{
			"dispVal":"50",
			"value":50
		},{
			"dispVal":"100",
			"value":100
		},{
			"dispVal":"200",
			"value":200
		},{
			"dispVal":"500",
			"value":500
		},{
			"dispVal":"1000",
			"value":1000
		},{
			"dispVal":"2000",
			"value":2000
		},{
			"dispVal":"5000",
			"value":5000
		},{
			"dispVal":"10000",
			"value":10000
		}
		]
	});

	//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
	//+++++++++++++++++++++++++++++++ ExtJS Configurations ++++++++++++++++++++++++++++++++++++++++
	//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

	//read-only textfield displays the maximum vertical exaggeration, which can be typed in to display whole data
	var maxVertExagText= {
		xtype:'displayfield',
		id:'maxVertExagText',
		fieldLabel: getI18Nstr("maxexagg", "Max Vertical Exaggeration"),
		labelAlign:'top',
		height:50
	}

	//combobox for vertical exaggeration. User can either choose data or enter new value by hand.
	// The new value should be smaller than maximum vertical exaggeration
	var comboVertExag= {
		xtype:'combobox',
		id:'comboVertExag',
		fieldLabel: getI18Nstr("chooseexagg", "Choose Vertical Exaggeration"),
		labelAlign:'top',
		height:55,
		store: vertExagStore,
		queryMode: 'local',
		displayField: 'dispVal',
		valueField: 'value',
		validator: function(value) {
			if (isNaN(value)) {
				Ext4.getCmp('applyVertExagButton').setDisabled(true);
				return getI18Nstr("nan", "Value is not a number");
			} else if( parseFloat(value)<=0) {
				Ext4.getCmp('applyVertExagButton').setDisabled(true);
				return getI18Nstr("biggerthan0", "Value must be bigger than 0");
			} else if (parseFloat(value)<=maxVertExag && parseFloat(value)>0) {
				Ext4.getCmp('applyVertExagButton').setDisabled(false);
				return true;
			} else if (value=="") {
				Ext4.getCmp('applyVertExagButton').setDisabled(true);
				return true;
			} else {
				Ext4.getCmp('applyVertExagButton').setDisabled(true);
				return getI18Nstr("biggerthanmax", "Value is bigger than max vertical exaggeration");
			}
		}
	}

	//combobox for vertical exaggeration. User can either choose data or enter new value by hand.
	// The new value should be smaller than maximum vertical exaggeration
	var applyVertExagButton= {
		xtype:'button',
		id:'applyVertExagButton',
		text: getI18Nstr("apply", "Apply"),
		scale:'medium',
		handler : function() {
			//the new vertical range gets calculated by the entered value. This value gets added to the minimal y-axis value from numberfield
			var comboValue=parseFloat(Ext4.getCmp('comboVertExag').getValue());
			var vertRange=parseInt(Ext4.getCmp('yStartValueTxt').getValue())+calcVertRange(comboValue);
			//the chart gets only redrawn, if the new value is bigger than the maximum elevation
			if(vertRange>maxElevation) {
				//remove chart from container
				Ext4.getCmp('chartContainer').removeAll();
				//round vertical range to 50er
				vertRange=(Math.floor(vertRange/50)*50);
				createElevationChart(parseInt(Ext4.getCmp('yStartValueTxt').getValue()), vertRange);
				//filter data, that is smaller than min value from y-axis-value field and display it in chart
				elevationStore.loadData(filterDataByMinValue(parseInt(Ext4.getCmp('yStartValueTxt').getValue())));
				Ext4.getCmp('vertExagNumberField').setValue(comboValue);
				currentMaxElevation=vertRange;
			} else {
				//alert('new vertical range below maximum elevation');
				//obj.select('---');
			}
		}
	}
	/**
	 * function: createHeightStartValueField(Number min, Number max)
	 * description: configuration function for starting y-value. Minimum and Maximum-value get passed.
	 * function gets called while creating profile window.
	 * parameters:
	 * -    min:    minimum value as number (lowest value from data)
	 * -	max:	maximum value as number (highest value from data)
	 * return:  configuration for y-value numberfield
	 */
	function createHeightStartValueField(min,max) {
		return {
			xtype: 'numberfield',
			id: 'yStartValueTxt',
			fieldLabel: getI18Nstr("yaxis", "Y-Axis"),
			labelAlign:'top',
			value: min,
			maxValue: max-50, //abstract 50 to always show region of at least 50m
			minValue: min,
			//region:'south',
			height:55,
			disableKeyFilter:true,
			keyNavEnabled: true,
			border:false,
			decimalSeparator:',',
			decimalPrecision:0,
			style: {
				paddingTop: 10
			},
			step:50,
			editable:true,
			listeners: {
				change: {
					fn: function(obj, newVal, oldVal) {
						Ext4.getCmp('chartContainer').removeAll();
						//draw new axis with new min-value
						//createElevationChart(parseInt(newVal), maxElevation);
						createElevationChart(parseInt(newVal), currentMaxElevation);
						//filter data, that is smaller than new min value and display it in chart
						elevationStore.loadData(filterDataByMinValue(parseInt(newVal)));
					}
				}
			}

		};
	}

	/**
	 * function: createVertExagNumberField()
	 * description: configuration function for vertical exaggeration displayfield. This field is not editable by the user and displays current
	 * vertical exaggeration as soon as chart gets resized or any input value changes.
	 * return:  configuration for vertical exaggeration displayfield
	 */
	function createVertExagNumberField() {
		return {
			xtype: 'displayfield',
			id: 'vertExagNumberField',
			fieldLabel: getI18Nstr("vertexagg", "Vertical Exaggeration"),
			labelAlign:'top',
			height:55,
			value:1
		};
	}

	//read-only textfield displays the maximum vertical exaggeration, which can be typed in to display whole data
	var minYAxisText= {
		xtype:'displayfield',
		id:'minYAxisText',
		fieldLabel: getI18Nstr("min", "Min"),
		labelAlign:'left',
		labelWidth:35,
		height:20
	}
	//read-only textfield displays the maximum vertical exaggeration, which can be typed in to display whole data
	var maxYAxisText= {
		xtype:'displayfield',
		id:'maxYAxisText',
		fieldLabel: getI18Nstr("max", "Max"),
		labelAlign:'left',
		labelWidth:35,
		height:20
	}
	//main control panel holds all controls
	var northControlPanel= {
		id:'northControlPanel',
		xtype:'panel',
		height:130,
		bodyStyle: {
			background: '#dfe8f6 '
		},

		border: true,
		region:'north',
		layout: {
			type: 'vbox',
			align: 'stretch',
			padding: 5
		},
		items:[createVertExagNumberField(),maxVertExagText]
	}

	//main control panel holds all controls
	var mainControlPanel= {
		id:'mainControlPanel',
		xtype:'container',
		//style: 'border: 1px solid #666',
		region:'center',
		layout: {
			type: 'vbox',
			align: 'stretch',
			padding: 5
		},
		items:[comboVertExag,applyVertExagButton]
	}
	var southControlPanel= {
		id:'southControlPanel',
		xtype:'panel',
		height:80,
		bodyStyle: {
			background: '#dfe8f6 '
		},

		border: true,
		region:'south',
		layout: {
			type: 'vbox',
			align: 'stretch',
			padding: 5
		},
		items:[minYAxisText,maxYAxisText]
	}

	/**
	 * function: createElevationChart(Number min, Number max)
	 * description: function creates configuration for elevation-chart and adds it to 'chartContainer' in profile window.
	 * The minimum value and maximum value for y-axis get passed. Function gets called when main profile window gets created
	 * and when yStartValue-numberfield value changes.
	 * parameters:
	 * -    min:    minimum value sets min-value of y-axis in chart.
	 * -	max:	maximum value sets max-value of y-axis in chart.
	 */
	function createElevationChart(min,max) {
		elevationChart= {
			id:'elevationChart',
			xtype: 'chart',
			animate: true,
			store: elevationStore,
			listeners: {
				resize: {
					fn: function(obj, newWidth, newSize) {
						var vertExag=Math.floor(calcVertExag()*Math.pow(10,2))/Math.pow(10,2);
						Ext4.getCmp('vertExagNumberField').setValue(vertExag);
						Ext4.getCmp('maxVertExagText').setValue(Math.floor(calcMaxVertExag()*Math.pow(10,2))/Math.pow(10,2));
						Ext4.getCmp('comboVertExag').validate();

						//apply filter to combobox
						//clear filter
						var ds = vertExagStore;
						if (ds.realSnapshot && ds.realSnapshot != ds.snapshot) {
							ds.snapshot = ds.realSnapshot;
							delete ds.realSnapshot;
						}
						ds.clearFilter(true);
						//filter values smaller than maxVertExag out of combobox
						ds.filterBy( function fn(obj) {
							if(obj.get('value')<maxVertExag) {
								return true;
							} else {
								return false;

							}
						});
						ds.realSnapshot = ds.snapshot;
						ds.snapshot = ds.data;

					}
				}
			},
			shadow: false,
			theme: 'Blue',
			axes: [{
				type: 'Numeric',
				id:'yValAxis',
				xtype: 'Axis',
				minimum: min,
				maximum: max,
				adjustMinimumByMajorUnit:false,
				decimals:0,
				position: 'left',
				majorTickSteps:9,
				fields: ['elevation'],
				title: getI18Nstr("heightinm", "Height [m]"),
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
				maximum: totalLength,
				fields: ['xAxisLength'],
				decimals:1,
				title: getI18Nstr("pathinkm", "Path [km]"),
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
					width: 165,
					height: 50,
					renderer: function(storeItem, item) {
						//cut digits
						var elevation=Math.floor(storeItem.get('displayElevation'));

						//set number of digits for coordinates
						var digits=7;
						var lat=storeItem.get('lat');
						var lon=storeItem.get('lon');

						// show marker on map
						setMoveableMarker(lat, lon);

						//set digit number, convert to string and replace "." with ","
						lat=(Math.floor(lat*Math.pow(10,digits))/Math.pow(10,digits)+'').replace(".",getI18Nstr("numsep", "."));
						lon=(Math.floor(lon*Math.pow(10,digits))/Math.pow(10,digits)+'').replace(".",getI18Nstr("numsep", "."));
						//lat=(Math.floor(lat*Math.pow(10,digits))/Math.pow(10,digits)+'').replace(".",",");
						//lon=(Math.floor(lon*Math.pow(10,digits))/Math.pow(10,digits)+'').replace(".",",");

						//tooltip text
						this.setTitle(getI18Nstr("height", "Height") + ': ' + elevation + ' m <br> ' + getI18Nstr("lat", "Latitude") + ': '+ lat + '<br> ' + getI18Nstr("lon", "Longitude") + ': '+ lon);
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
						//show marker Char
						//convert via ascii code to char
						return String.fromCharCode(n+65)/*+': ' + elevationStore.findRecord('markerIndex',n+1).get('direction')*/;
					},
					'text-anchor': 'middle',
					contrast: false
				},

				xField: 'index',
				yField: 'markerElevation',
				tips: {
					trackMouse: false,
					autoScroll:true,
					width: 170,
					height: 60,
					renderer: function(storeItem, item) {
						//cut digits
						var elevation=Math.floor(storeItem.get('displayElevation'));

						//set number of digits for coordinates
						var digits=7;
						var lat=storeItem.get('lat');
						var lon=storeItem.get('lon');

						// show marker on map
						setMoveableMarker(lat, lon);

						//set digit number, convert to string and replace "." with ","
						lat=(Math.floor(lat*Math.pow(10,digits))/Math.pow(10,digits)+'').replace(".",getI18Nstr("numsep", "."));
						lon=(Math.floor(lon*Math.pow(10,digits))/Math.pow(10,digits)+'').replace(".",getI18Nstr("numsep", "."));

						//tooltip text
						if (storeItem.get('direction')!="") {
							this.setTitle(getI18Nstr("height", "Height") + ': ' + elevation + ' m <br> ' + getI18Nstr("lat", "Latitude") + ': '+ lat + '<br> ' + getI18Nstr("lon", "Longitude") + ': '+ lon  +'<br>' + getI18Nstr("dir", "Direction") + ': '+ storeItem.get('direction') );
							
						} else {
							this.setTitle(getI18Nstr("height", "Height") + ': ' + elevation + ' m <br> ' + getI18Nstr("lat", "Latitude") + ': '+ lat + '<br> ' + getI18Nstr("lon", "Longitude") + ': '+ lon+'<br> 	<br>' );

						}
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
		//round minimum value to 50er
		minElevation=(Math.floor(minElevation/50)*50);

		//detect highest value from data
		maxElevation=Math.floor(elevationStore.max('elevation'));
		//round maximum value to next higher hundreder and add 100
		maxElevation=(Math.floor(maxElevation/50)*50)+50;
		currentMaxElevation=maxElevation;
		//create window component
		win = Ext4.createWidget('window', {
			id: 'chartWindow',
			width: 700,
			height: 400,
			x: 100,
			y: 100,
			hidden: false,
			maximizable: true,
			title: getI18Nstr("heightprofile", "Height Profile"),
			renderTo: Ext4.getBody(),
			layout: 'fit',
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
					items:[northControlPanel,mainControlPanel,southControlPanel]
				}
				,{
					xtype: 'container',
					id: 'chartContainer',
					flex: 8,
					border: false,
					height: 450,
					layout: {
						type: 'fit'
					},
					items:[]//leave item empty, because it gets generated and added through createElevationChart()-function
				}]
			}	]

		});

		//add min y-value-axis numberfield
		Ext4.getCmp('mainControlPanel').add(createHeightStartValueField(minElevation,maxElevation));

		createElevationChart(minElevation,maxElevation);

		var vertExag=Math.floor(calcVertExag()*Math.pow(10,2))/Math.pow(10,2);
		Ext4.getCmp('vertExagNumberField').setValue(vertExag);
		Ext4.getCmp('minYAxisText').setValue(minElevation);
		Ext4.getCmp('maxYAxisText').setValue(maxElevation-50);

	}
	//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
	//+++++++++++++++++++++++++++++++ Functions +++++++++++++++++++++++++++++++++++++++++++++++++++
	//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

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
	 * function: generateElevationDataFromResults(Array results, Number totalLength)
	 * description: Function parses result-array from elevation service and puts result data into return-array.
	 * Return-array acts as data for JSON-Store --> chart-data
	 * parameters:
	 * -    results:    	array returned from elevation-service
	 * -	totalLength:	total length of all path segments
	 * return:  Array data: array for chart-data. Fields: [index, elevation, lat, lon]
	 */
	window.generateElevationDataFromResults = function (results, totalLength) {
		var data = [];
		var gapLength=totalLength/results.length;
		var totalGapLength=0;
		//get max Elevation for marker label placement in chart
		maxElevation=results[0].elevation;
		for (var i = 1; i < results.length; i++) {
			if (results[i].elevation>=maxElevation) {
				maxElevation=results[i].elevation;
			}
		}
		//round it to a 50er value and add offset. Marker labels must be always visible
		maxElevation=(Math.floor(maxElevation/50)*50)+47;

		for (var i = 0; i < results.length; i++) {

			if (results[i].breakPoint) {

				data.push({
					index: i,
					elevation: results[i].elevation,//elevation can be changed through filter, this is why displayElevation is needed
					displayElevation: results[i].elevation,
					lat: results[i].lat,
					lon: results[i].lon,
					markerElevation:maxElevation,
					direction: results[i].breakPoint.directionString,
					markerNo: String.fromCharCode(results[i].breakPoint.index+65),
					markerIndex: results[i].breakPoint.index,
					xAxisLength:totalGapLength
				});
			} else {
				data.push({
					index: i,
					elevation: results[i].elevation,
					displayElevation: results[i].elevation,
					lat: results[i].lat,
					lon: results[i].lon,
					xAxisLength:totalGapLength
				});
			}
			totalGapLength+=gapLength;
		}
		//save current data to global array
		currentStoreData=cloneArray(data);
		return data;
	};
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
		totalLength=pathCollection.totalLength;
		elevationStore.loadData(generateElevationDataFromResults(elevationArray, totalLength));
	}
	/**
	 * function: filterDataByMinValue(Number min)
	 * description: function loops through currentDataStore and checks if each value is bigger than passed min-value.
	 * 				When value is smaller then min-value, it gets set to min-value in order to still display it in chart at the bottom.
	 * 				Filter-function of Store-class wouldn't display it.
	 * parameters:
	 * -    min:    minimum value from starting y-value-numberfield.
	 * return:  Array retData: Array with updated elevations
	 * */
	function filterDataByMinValue(min) {
		var retData=cloneArray(currentStoreData);
		for (var i = 0; i < retData.length; i++) {
			if(retData[i].elevation<=min) {
				retData[i].elevation=min;
			}
		}
		return retData;
	}

	function calcVertRange(vertExag) {
		var maxHor=Ext4.getCmp('elevationChart').axes.items[1].to;
		maxHor=Math.floor(maxHor*Math.pow(10,1))/Math.pow(10,1)
		var chartWidth=Ext4.getCmp('elevationChart').getWidth()-90;
		var horScale=maxHor/chartWidth;
		var chartHeight=Ext4.getCmp('elevationChart').getHeight()-74;
		var range=horScale*(chartHeight/vertExag);
		return range*1000;
	}

	function calcVertExag() {
		var maxHor=Ext4.getCmp('elevationChart').axes.items[1].to;
		maxHor=Math.floor(maxHor*Math.pow(10,1))/Math.pow(10,1)
		var chartWidth=Ext4.getCmp('elevationChart').getWidth()-90;
		var horScale=maxHor/chartWidth;
		var chartHeight=Ext4.getCmp('elevationChart').getHeight()-74;
		//var range=maxElevation-minElevation;
		var range=Ext4.getCmp('elevationChart').axes.items[0].to-Ext4.getCmp('elevationChart').axes.items[0].from;
		var vertScale=range*0.001/chartHeight;
		var vertExag= horScale/vertScale;
		return vertExag;
	}

	function calcMaxVertExag() {
		var maxHor=Ext4.getCmp('elevationChart').axes.items[1].to;
		maxHor=Math.floor(maxHor*Math.pow(10,1))/Math.pow(10,1)
		var chartWidth=Ext4.getCmp('elevationChart').getWidth()-90;
		var horScale=maxHor/chartWidth;
		var chartHeight=Ext4.getCmp('elevationChart').getHeight()-74;
		var range=maxElevation-parseInt(Ext4.getCmp('yStartValueTxt').getValue());
		var vertScale=range*0.001/chartHeight;
		var vertExag= horScale/vertScale;
		maxVertExag=vertExag;
		return vertExag;
	}

});
/**
 * function: cloneArray(Array soureArr)
 * description: recursive function duplicates array
 * parameters:
 * -    soureArr:    source-array
 * return:  Array clonedArr: copy of array
 * */
function cloneArray(soureArr) {
	var clonedArr = (soureArr instanceof Array) ? [] : {};
	for (i in soureArr) {
		if (i == 'clone')
			continue;
		if (soureArr[i] && typeof soureArr[i] == "object") {
			clonedArr[i] = cloneArray(soureArr[i]);
		} else
			clonedArr[i] = soureArr[i]
	}
	return clonedArr;
};