/**
 * function: azimuthApprox(latStart, lonStart, latEnd, lonEnd)
 * description: Calculate estimated azimuth between two points
 * parameters:
 * -    latStart:   latitude of starting point [rad]
 * -    lonStart:   longitude of starting point [rad]
 * -    latEnd:     latitude of end point [rad]
 * -    lonEnd:     longitude of end point [rad]
 * return:  Number azimuth: approximated azimuth
 */
function azimuthString(latStart, lonStart, latEnd, lonEnd)
{
    var azStrTable = [ "N", "NE", "E", "SE", "S", "SW", "W", "NW", "N" ];
    var az = azimuthApprox(latStart, lonStart, latEnd, lonEnd);
    var index = Math.round(8*az/(Math.PI*2));
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

