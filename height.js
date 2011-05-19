getHeightAlongPath(null, null);

/**
 * function: getHeightAlongPath(pointArray, callback)
 * description: Gets the height from a path
 * parameters:
 * -    pointArray:    e.g. [{lat: 54.4545, lon: 8.3443},{lat: 54.4545, lon: 8.3443}, ... ]
 * return:  Array heights: [[{lat, lon, 54.4}, ... ]
 */
function getHeightAlongPath(pointArray, callback)
{
    // callback([[54.4, 54.6, 54.9], [53.2, 53.4, 53.8], [52.2, 52.4, 52.8]]);
	
	// Create an ElevationService.
	    elevator = new google.maps.ElevationService();
	 
	  var whitney = new google.maps.LatLng(36.578581, -118.291994);
	  var lonepine = new google.maps.LatLng(36.606111, -118.062778);
  
 	  var path = [ whitney, lonepine];
  
	
	// Create a PathElevationRequest object using this array.
	// Ask for 256 samples along that path.
		  var pathRequest = {
		   'path': path,
		   'samples': 256
	}
	
	// Initiate the path request.
	    elevator.getElevationAlongPath(pathRequest, googleElevationcallback);

}

function googleElevationcallback (results, status)
{
		
}
