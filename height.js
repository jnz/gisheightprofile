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
        for (i = 1; i < segmentArray.length; i++) {
            cIndex = (returnArray.length-1)*segmentArray[i].cumulativeLength /
                         pathCollection.totalLength; // position in the path from 0..1
            cIndex = Math.round(cIndex); // we need an integer for the array index

            returnArray[cIndex].breakPoint = { azimuth         : segmentArray[i].azimuth,
                                               directionString : segmentArray[i].directionString,
                                               index           : i // segment index
                                             };
        }
        callback(returnArray, pathCollection);
    }
    else {
        callback(null, null);
    }
}

/**
 * function: getPathSamplePoints(latStart, lonStart, latEnd, lonEnd, samplepoints)
 * description: Gets coordinates between two points. Samplepoints determines how
 * many points are calculated along the geodesic.
 * parameters:
 * -    latStart:  latitude of starting point
 * -    lonStart:  longitude of starting point
 * -    latEnd:    latitude of end point
 * -    lonEnd:    longitude of end point
 *
 * return: coordinate array
 */
function getPathSamplePoints(latStart, lonStart, latEnd, lonEnd, samplepoints)
{
    var fromLonLat     = new OpenLayers.LonLat(lonStart, latStart);
    var toLonLat       = new OpenLayers.LonLat(lonEnd, latEnd);
    var currentLonLat  = new OpenLayers.LonLat(lonStart, latStart);
    var totalLength    = OpenLayers.Util.distVincenty(fromLonLat, toLonLat);
    var segment        = totalLength/samplepoints;
    var i;
    var pathArray      = [];

    var dx = (lonEnd - lonStart)/totalLength;
    var dy = (latEnd - latStart)/totalLength;

    for (i = 0; i < samplepoints; i++)
    {
        pathArray.push(currentLonLat.lat);
        pathArray.push(currentLonLat.lon);
        currentLonLat = currentLonLat.add(dx, dy);
    }
}

function mapquestRequest(latStart, lonStart, latEnd, lonEnd)
{
    var mapquestURL = 'http://open.mapquestapi.com';
    var urlreq = mapquestURL + '/elevation/v1/getElevationProfile?callback=mapquestResponse&shapeFormat=raw';
    var script = document.createElement('script');
    script.type = 'text/javascript';
    var i;

    urlreq += '&latLngCollection=';
    // urlreq += latStart + ',' + lonStart + ',' + latEnd + ',' + lonEnd;
    var pathArray = getPathSamplePoints(latStart, lonStart, latEnd, lonEnd, 10);
    urlreq += pathArray[0];
    for (i = 1; i < pathArray.length; i++) {
        urlreq += "," + pathArray[i];
    }

    script.src = urlreq;
    document.body.appendChild(script);
}

function mapquestResponse(response)
{
    var path = response.elevationProfile;
    var html = '';
    var i = 0;
    for(; i < path.length; i++) {
        // path[i].height;
        // path[i].distance;
    }
}

