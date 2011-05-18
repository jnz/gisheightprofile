/*
 *  This file needs to be removed.
 *
 *  http://dev.openlayers.org/docs/files/OpenLayers/Geometry/Collection-js.html
 *
 *  evt.geometry.bounds = null
 *  evt.geometry.components = [  ]
 *  evt.geometry.components[0].x
 *  evt.geometry.components[0].y
 *  evt.measure = 4544.33443
 *  evt.unit = "km"
 *
 *
 *  evt.geometry
 *  Class
 *  bounds: null
 *  components: Array[3]
 *  id: "OpenLayers.Geometry.LineString_105"
 *  __proto__: Class
 *  CLASS_NAME: "OpenLayers.Geometry.LineString"
 *  addComponent: function (component,index){var added=false;if(component){if(this.componentTypes==null||(OpenLayers.Util.indexOf(this.componentTypes,component.CLASS_NAME)>-1)){if(index!=null&&(index<this.components.length)){var components1=this.components.slice(0,index);var components2=this.components.slice(index,this.components.length);components1.push(component);this.components=components1.concat(components2);}else{this.components.push(component);}
 *  addComponents: function (components){if(!(components instanceof Array)){components=[components];}
 *  addPoint: function (point,index){this.addComponent(point,index);}
 *  atPoint: function (lonlat,toleranceLon,toleranceLat){var atPoint=false;var bounds=this.getBounds();if((bounds!=null)&&(lonlat!=null)){var dX=(toleranceLon!=null)?toleranceLon:0;var dY=(toleranceLat!=null)?toleranceLat:0;var toleranceBounds=new OpenLayers.Bounds(this.bounds.left-dX,this.bounds.bottom-dY,this.bounds.right+dX,this.bounds.top+dY);atPoint=toleranceBounds.containsLonLat(lonlat);}
 *  bounds: null
 *  calculateBounds: function (){this.bounds=null;if(this.components&&this.components.length>0){this.setBounds(this.components[0].getBounds());for(var i=1,len=this.components.length;i<len;i++){this.extendBounds(this.components[i].getBounds());}}}
 *  clearBounds: function (){this.bounds=null;if(this.parent){this.parent.clearBounds();}}
 *  clone: function (){var geometry=eval("new "+this.CLASS_NAME+"()");for(var i=0,len=this.components.length;i<len;i++){geometry.addComponent(this.components[i].clone());}
 *  componentTypes: Array[1]
 *  components: null
 *  destroy: function (){this.components.length=0;this.components=null;OpenLayers.Geometry.prototype.destroy.apply(this,arguments);}
 *  distanceTo: function (geometry,options){var edge=!(options&&options.edge===false);var details=edge&&options&&options.details;var result,best={};var min=Number.POSITIVE_INFINITY;if(geometry instanceof OpenLayers.Geometry.Point){var segs=this.getSortedSegments();var x=geometry.x;var y=geometry.y;var seg;for(var i=0,len=segs.length;i<len;++i){seg=segs[i];result=OpenLayers.Geometry.distanceToSegment(geometry,seg);if(result.distance<min){min=result.distance;best=result;if(min===0){break;}}else{if(seg.x2>x&&((y>seg.y1&&y<seg.y2)||(y<seg.y1&&y>seg.y2))){break;}}}
 *  equals: function (geometry){var equivalent=true;if(!geometry||!geometry.CLASS_NAME||(this.CLASS_NAME!=geometry.CLASS_NAME)){equivalent=false;}else if(!(geometry.components instanceof Array)||(geometry.components.length!=this.components.length)){equivalent=false;}else{for(var i=0,len=this.components.length;i<len;++i){if(!this.components[i].equals(geometry.components[i])){equivalent=false;break;}}}
 *  extendBounds: fun
 *
 */
