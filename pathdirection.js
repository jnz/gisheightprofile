/**
 * function: directionString(latStart, lonStart, latEnd, lonEnd)
 * description: direction string "N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"
 * parameters:
 * -    latStart:   latitude of starting point [rad]
 * -    lonStart:   longitude of starting point [rad]
 * -    latEnd:     latitude of end point [rad]
 * -    lonEnd:     longitude of end point [rad]
 * return:  String: String from azimuth:  "N", "NE", "E", "SE", "S", "SW", "W",
 * "NW", "N"
 */
function directionString(latStart, lonStart, latEnd, lonEnd)
{
    var azimuth = azimuthApprox(latStart, lonStart, latEnd, lonEnd);
    return azimuthStringFromAzimuth(azimuth);
}

/**
 * function: directionStringFromAzimuth(azimuth)
 * description: direction string "N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"
 * parameters:
 * -    azimuth:    azimuth [rad]
 * return:  String
 */
function directionStringFromAzimuth(azimuth)
{
    //var azStrTable = [ "N", "NE", "E", "SE", "S", "SW", "W", "NW", "N" ];
    var azStrTable = [ "North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West", "North" ];
    var index = Math.round(8*azimuth/(Math.PI*2));
    return azStrTable[index];
}

/**
 * function: azimuthApprox(latStart, lonStart, latEnd, lonEnd)
 * description: Calculate estimated azimuth between two points.
 * Warning: This is not a strict geodetic calculation.
 * parameters:
 * -    latStart:   latitude of starting point [rad]
 * -    lonStart:   longitude of starting point [rad]
 * -    latEnd:     latitude of end point [rad]
 * -    lonEnd:     longitude of end point [rad]
 * return:  Number azimuth: approximated azimuth
 */
function azimuthApprox(latStart, lonStart, latEnd, lonEnd)
{
    // This is basically the "zweite geodätische Hauptaufgabe"
    // A strict solution can be found in:
    // http://www.gia.rwth-aachen.de/Forschung/AngwGeodaesie/geodaetische_linie/artikel1/node7.html
    // RWTH Aachen, Institut für Geodäsie

    var dB = latEnd - latStart;
    var dL = lonEnd - lonStart;
    var az = Math.atan2(dL, dB); // this gives us the angle from the north-axis in clockwise order
    if(az < 0) {
        az += 2*Math.PI; // we only want positive values
    }
    return az;
}

