var TPF = require("./TripPlanner_functions.js");
//var TPF = require("./TripPlanner_trip.js");

var chooseOne = function(a, b){
	if (a != null) return a;
	return b;
}

exports.getLastTrains = function(dayType, station){

	//Function tryTakingTrain_LT
	var tryTakingTrain_LT = function(dayType, tripNo, station){
		//Set up my trip
		var myTrip = global.trips[dayType][tripNo];
		//var trainType = myTrip.trainType;
		var stationIndex = myTrip.timetable.findIndex(function(item){ return item.stop == station; });
		//Check if the station is board only --> break
		if (myTrip.timetable[stationIndex].boardOnly) return null;
		//For each station before
		for (var i = stationIndex - 1; i >= 0; i--){
			//Check if this station is boardable
			if ((!myTrip.timetable[i].alightOnly) && (myTrip.timetable[i].depart != null)){
				var station2 = myTrip.timetable[i].stop;
				var board = myTrip.timetable[i].depart_ss;
				//If the board time is later than the previous record --> update
				if (latestDeparture[station2] != null){
					if (latestDeparture[station2].time < board){
						var from_track = myTrip.timetable[i].track;
						latestDeparture[station2].time = board;
						latestDeparture[station2].track = from_track;
						//Get connecting trains
						var connectingTrains = TPF.getConnectingTrains(dayType, station2, from_track, null, board, false);
						//For each connecting trains, try transfer
						for (var j in connectingTrains){
							tryTakingTrain_LT(dayType, connectingTrains[j].tripNo, station2);
						}
					}
				}
			}
		}
	}

	//Prepare lastest departure object
	var latestDeparture = {};
	for (var s in global.stations) latestDeparture[s] = {
		time: 0,
		track: "",
	};
	delete latestDeparture[station];

	//Get the last trip (propagate up)
	var firstTrains = TPF.getFirstTrains(dayType, station, null, 86400 * 2, false);
	for (var j in firstTrains){
		var tripNo = firstTrains[j].tripNo;
		tryTakingTrain_LT(dayType, tripNo, station);
	}
	//Return the object
	return latestDeparture;

}