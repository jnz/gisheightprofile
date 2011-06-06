/**
 * function: getHeightAlongPath(pointArray, callback)
 * description: Gets the height from a path
 * The callback function gives you the following array, which consits of
 * several arrays for each line segment.
 *      [[{lat, lon, elevation}, ... ], [{lat, lon, elevation}, ... ], ... ]
 * parameters:
 * -    pathCollection:    (const) array with the following attributes per items:
 *                              from (current projection)
 *                              to (current projection)
 *                              fromLonLat (OpenLayer.LonLat, WGS84, deg)
 *                              toLonLat (OpenLayer.LonLat, WGS84, deg)
 *                              segmentLength (km)
 *                              azimuth (rad)
 *                              directionString
 *                              cumulativeLength (km) (length of previous segments)
 * -    callback: function pointer with the signature (returnArray, pathCollection)
 *
 * return: null (see callback function)
 */
function getHeightAlongPath(pathCollection, callback)
{
    mapquestRequest(pathCollection, callback);

    // Create an ElevationService.
    var elevator = new google.maps.ElevationService();
    var i;
    var segmentArray = pathCollection.segmentArray;
    var segCount = segmentArray.length; // segment count
    var path = new Array(segCount+1); // e. g. 2 segments have 3 points

    // Create the path from the segments.
    for (i = 0; i < segCount; i++) {
        path[i] = new google.maps.LatLng(segmentArray[i].fromLonLat.lat,
                                         segmentArray[i].fromLonLat.lon);
    }
    path[segCount] = new google.maps.LatLng(segmentArray[segCount-1].toLonLat.lat,
                                            segmentArray[segCount-1].toLonLat.lon);

    // Create a PathElevationRequest object using this array.
    // Ask for 256 samples along that path.
    var pathRequest = {
        'path'    : path,
        'samples' : 200
    };

    // Initiate the path request.
    elevator.getElevationAlongPath(pathRequest,
            function(results, status) {
                googleElevationCallback(results, status, callback, pathCollection);
            });
}

/**
 * function: googleElevationCallback(results, status, callback, pathCollection)
 * description: Gets called by the Google Maps Elevation API.
 * parameters:
 * -    results:            Array with height informations
 * -    status:             Error message
 * -    callback:           Callback function of the original caller
 * -    pathCollection:     Path information
 */
function googleElevationCallback(results, status, callback, pathCollection)
{
    if (status == google.maps.ElevationStatus.OK) {
        var i;
        var cIndex;
        var segmentArray = pathCollection.segmentArray;
        var returnArray = new Array(results.length);
        // the returnArray is filled with the height data
        for (i = 0; i < results.length; i++) {
            returnArray[i] = { lat        : results[i].location.lat(),
                               lon        : results[i].location.lng(),
                               elevation  : results[i].elevation,
                               breakPoint : null };
        }
        // now we set the breakPoint attribute for positions
        // where the path is changing its direction.
        // this can be used by the chart functions to add additional
        // informations to the chart.
        for (i = 0; i < segmentArray.length; i++) {
            cIndex = (returnArray.length-1)*segmentArray[i].cumulativeLength /
                         pathCollection.totalLength; // position in the path from 0..1
            cIndex = Math.round(cIndex); // we need an integer for the array index

            returnArray[cIndex].breakPoint = { azimuth         : segmentArray[i].azimuth,
                                               directionString : segmentArray[i].directionString,
                                               index           : i // segment index
                                             };
        }
        // set the breakpoint attribute of the last point,
        // but do net set azimuth or directionString, as they make no sense here
        returnArray[returnArray.length-1].breakPoint = {
            azimuth         : 0,
            directionString : "",
            index           : i
        };
        callback(returnArray, pathCollection);
    }
    else {
        callback(null, null);
    }
}

/**
 * function: getPathSamplePoints(pathCollection)
 * description: Gets sampled coordinates along the path.
 * parameters:
 * -    pathCollection:    (const) array with the following attributes per items:
 *                         from (current projection)
 *                         to (current projection)
 *                         fromLonLat (OpenLayers.LonLat, WGS84, deg)
 *                         toLonLat (OpenLayers.LonLat, WGS84, deg)
 *                         segmentLength (km)
 *                         azimuth (rad)
 *                         directionString
 *                         cumulativeLength (km) (length of previous segments)
 *
 * return: coordinate array
 */
function getPathSamplePoints(pathCollection)
{
    var samplepoints = 100;
    var singleSegment = pathCollection.totalLength/samplepoints; // unit [km]
    var pathArray = [];
    var segmentArray = pathCollection.segmentArray;
    var segCount = segmentArray.length;
    var i;
    var lonEnd, latEnd, lonStart, latStart;
    var pointsInSegment;

    // Create the path from the segments.
    for (i = 0; i < segCount; i++) {
        latStart = segmentArray[i].fromLonLat.lat;
        lonStart = segmentArray[i].fromLonLat.lon;
        latEnd   = segmentArray[i].toLonLat.lat;
        lonEnd   = segmentArray[i].toLonLat.lon;

        // naive non-geodetic curve:
        var dx = (lonEnd - lonStart)/segmentArray[i].segmentLength;
        var dy = (latEnd - latStart)/segmentArray[i].segmentLength;

        pointsInSegment = Math.floor(segmentArray[i].segmentLength/singleSegment);
        var currentLonLat = new OpenLayers.LonLat(lonStart, latStart);
        for (i = 0; i < pointsInSegment; i++)
        {
            pathArray.push(currentLonLat.lat);
            pathArray.push(currentLonLat.lon);
            currentLonLat = currentLonLat.add(dx, dy);
        }
    }
    return pathArray;
}

var MAPQUEST_PRECISION = 5;
function mapquestRequest(pathCollection, callback)
{
    var mapquestURL = 'http://open.mapquestapi.com';
    var urlreq = mapquestURL + '/elevation/v1/getElevationProfile?callback=mapquestResponse&useFilter=true&shapeFormat=cmp&inShapeFormat=cmp&outShapeFormat=cmp';
    var pathArray = getPathSamplePoints(pathCollection);
    var compressed = compress(pathArray, MAPQUEST_PRECISION);
    var script = document.createElement('script');
    script.type = 'text/javascript';

    urlreq += '&latLngCollection=';
    urlreq += compressed;

    script.src = urlreq;
    document.body.appendChild(script);
}

function mapquestResponse(response)
{
    var points = decompress(response.shapePoints, MAPQUEST_PRECISION);
    var path = response.elevationProfile;
    var html = '';

    for(var i = 0; i < path.length; i++) {
        console.log("Height: " + path[i].height + "\n");
        // path[i].height;
        // path[i].distance;
    }
}

function decompress(encoded, precision)
{
    precision = Math.pow(10, -precision);
    var len = encoded.length, index=0, lat=0, lng = 0, array = [];
    while (index < len) {
        var b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        array.push(lat * precision);
        array.push(lng * precision);
    }
    return array;
}

function compress(points, precision)
{
   var oldLat = 0, oldLng = 0, len = points.length, index = 0;
   var encoded = '';
   precision = Math.pow(10, precision);
   while (index < len) {
      //  Round to N decimal places
      var lat = Math.round(points[index++] * precision);
      var lng = Math.round(points[index++] * precision);

      //  Encode the differences between the points
      encoded += encodeNumber(lat - oldLat);
      encoded += encodeNumber(lng - oldLng);

      oldLat = lat;
      oldLng = lng;
   }
   return encoded;
}

function encodeNumber(num) {
    var num = num << 1;
    if (num < 0) {
        num = ~(num);
    }
    var encoded = '';
    while (num >= 0x20) {
        encoded += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
        num >>= 5;
    }
    encoded += String.fromCharCode(num + 63);
    return encoded;
}

