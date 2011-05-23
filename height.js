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
                               breakPoint : null
                             };
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
        callback(returnArray, pathCollection);
    }
    else {
        callback(null, null);
    }
}

