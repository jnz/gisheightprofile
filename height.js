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
 * -    callback: function pointer with the signature (returnArray, pathCollection)
 *
 * return: null (see callback function)
 */
function getHeightAlongPath(pathCollection, callback)
{
    // Create an ElevationService.
    var elevator = new google.maps.ElevationService();
    var i;
    var segCount = pathCollection.length; // path segment count
    var path = new Array(segCount+1); // e. g. 2 segments have 3 points

    // Create the path from the segments.
    for (i = 0; i < segCount; i++) {
        path[i] = new google.maps.LatLng(pathCollection[i].fromLonLat.lat,
                                         pathCollection[i].fromLonLat.lon);
    }
    path[segCount] = new google.maps.LatLng(pathCollection[segCount-1].toLonLat.lat,
                                            pathCollection[segCount-1].toLonLat.lon);

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
        var returnArray = new Array(results.length);
        for (i = 0; i < results.length; i++) {
            returnArray[i] = { lat       : results[i].location.lat(),
                               lon       : results[i].location.lng(),
                               elevation : results[i].elevation };
        }
        callback(returnArray, pathCollection);
    }
    else {
        callback(null, null);
    }
}

