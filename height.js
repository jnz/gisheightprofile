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
    elevator = new google.maps.ElevationService();

    var karlsruhe = new google.maps.LatLng(8.3990477422878, 49.027063581149);
    var stuttgart = new google.maps.LatLng(9.2559813360033, 48.738078363258);

    var path = [karlsruhe, stuttgart];

    // Create a PathElevationRequest object using this array.
    // Ask for 256 samples along that path.
    var pathRequest = {
        'path'    : path,
        'samples' : 128
    };

    // Initiate the path request.
    elevator.getElevationAlongPath(pathRequest,
            function(results, status) {
                googleElevationCallback(results, status, callback, pathCollection);
            });
}

function googleElevationCallback(results, status, callback, pathCollection, bias)
{
    if (status == google.maps.ElevationStatus.OK) {
        var i;
        var bias = -Math.random() * 500;
        var returnArray = new Array(results.length);
        for (i = 0; i < results.length; i++) {
            noise = Math.random()*20; // FIXME: remove this
            returnArray[i] = { lat       : results[i].location.lat(),
                               lon       : results[i].location.lng(),
                               elevation : results[i].elevation + bias + noise };
        }
        callback(returnArray, pathCollection);
    }
    else {
        callback(null);
    }
}

