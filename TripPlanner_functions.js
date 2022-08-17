/**
 * isUpbound(station1, station2, line) = true
 * getRoutings(station1, station2, propagateDown) = [ {lines: {"line": "stationFacing"}, maxTransfers: 0} ]
 * - known journey start time --> propagateDown = true, known journey end time --> propagateDown = false
 * getTransfers(station, track, propagateDown) = {trackNo: transferTimeInSeconds},
 * getDepartingTrains(dayType, station, track, time_early, time_late, noDuplication)
 * getArrivingTrains(dayType, station, track, time_early, time_late, noDuplication)
 * getConnectingTrains(dayType, station, track_from, $unused, time_near, time_span, propagateDown)
 * getFirstTrains(dayType, station, $unused, time_near, propagateDown)
 */

//isUpbound

var isUpbound = function(station1, station2, line){
	if (station1 == station2) return null;
	var si1 = global.lines[line].stationIndex[station1];
	var si2 = global.lines[line].stationIndex[station2];
	return (si1 < si2);
};

//getTransfers

var getTransfers = function(station, track, propagateDown){
	if (propagateDown){
		//Down
		if (global.stations[station].transfer[track] == null) return {};
		else return function($){
			var obj = {};
			for (var i in $) obj[i] = $[i] * 60; //Convert mins to secs
			return obj;
		}(global.stations[station].transfer[track]);
	}else{
		//Up
		var obj = {};
		for (var track_from in global.stations[station].transfer){
			if (global.stations[station].transfer[track_from][track] != null)
				obj[track_from] = global.stations[station].transfer[track_from][track] * 60; //Convert mins to secs
		}
		return obj;
	}
};

//getDepartingTrains, getArrivingTrains

var getDepartingTrains = function(dayType, station, track, $unused, time_early, time_late, noDuplication){
	//If time_early is earlier than the first train, shift
	if (global.timetable[dayType][station][track].depart.length){
		var firstTrip = global.timetable[dayType][station][track].depart[0].time;
		if (firstTrip != null && time_early < firstTrip){
			time_late += (firstTrip - time_early);
			time_early = firstTrip;
		}
	}
	//Find range of trips to be fetched
	var firstIndex = global.timetable[dayType][station][track].depart.findIndex(function(item){
		return item.time >= time_early;
	});
	var lastIndex = global.timetable[dayType][station][track].depart.findIndex(function(item){
		return item.time >= time_late;
	});
	if (firstIndex == -1) return [];
	lastIndex = (lastIndex == -1) ? (global.timetable[dayType][station][track].depart.length - 1) : (lastIndex - 1);
	//Search trips from firstIndex to lastIndex (inclusive)
	var trips = [];
	var alreadyHas = {}; //alreadyHas[trainType + "_" + terminateStop] e.g. alreadyHas.LEX_220
	for (var i = firstIndex; i <= lastIndex; i++){
		var tripNo = global.timetable[dayType][station][track].depart[i].trip;
		//Get information of the train
		var trainType = global.trips[dayType][tripNo].trainType;
		var terminateStop = global.trips[dayType][tripNo].terminateStop;
		var line = global.timetable[dayType][station][track].depart[i].line;
		var upbound = global.timetable[dayType][station][track].depart[i].upbound;
		//Get expected direction
		upbound_expected = upbound;
		//Do filtering
		if (noDuplication && alreadyHas[trainType + "_" + terminateStop] != null){ //Skip if already has the same train type of terminate stop
		}else if (upbound != upbound_expected){ //Skip if direction inappropiate
		}else{
			//If valid, push
			alreadyHas[trainType + "_" + terminateStop] = true;
			trips.push({tripNo: tripNo, line: line, upbound: upbound});
		}
	}
	//Return trips
	return trips;
};

var getArrivingTrains = function(dayType, station, track, $unused, time_early, time_late, noDuplication){
	//If time_early is earlier than the first train, shift
	if (global.timetable[dayType][station][track].arrive.length){
		var lastTrip = global.timetable[dayType][station][track].arrive[0].time;
		if (lastTrip != null && time_late > lastTrip){
			time_early -= (time_late - lastTrip);
			time_late = lastTrip;
		}
	}
	//Find range of trips to be fetched
	var firstIndex = global.timetable[dayType][station][track].arrive.findIndex(function(item){
		return item.time <= time_late;
	});
	var lastIndex = global.timetable[dayType][station][track].arrive.findIndex(function(item){
		return item.time <= time_early;
	});
	if (firstIndex == -1) return [];
	lastIndex = (lastIndex == -1) ? (global.timetable[dayType][station][track].arrive.length - 1) : (lastIndex - 1);
	//Search trips from firstIndex to lastIndex (inclusive)
	var trips = [];
	var alreadyHas = {}; //alreadyHas[trainType + "_" + beginStop] e.g. alreadyHas.LEX_220
	for (var i = firstIndex; i <= lastIndex; i++){
		var tripNo = global.timetable[dayType][station][track].arrive[i].trip;
		//Get information of the train
		var trainType = global.trips[dayType][tripNo].trainType;
		var beginStop = global.trips[dayType][tripNo].beginStop;
		var line = global.timetable[dayType][station][track].arrive[i].line;
		var upbound = global.timetable[dayType][station][track].arrive[i].upbound;
		//Get expected direction
		upbound_expected = upbound;
		//Do filtering
		if (noDuplication && alreadyHas[trainType + "_" + beginStop] != null){ //Skip if already has the same train type of begin stop
		}else if (upbound != upbound_expected){ //Skip if direction inappropiate
		}else{
			//If valid, push
			alreadyHas[trainType + "_" + beginStop] = true;
			trips.push({tripNo: tripNo, line: line, upbound: upbound});
		}
	}
	//Return trips
	return trips;
};

//getConnectingTrains

var getConnectingTrains = function(dayType, station, track_from, $unused, time_near, propagateDown){
	var trips = [];
	var time_span = global.planner.settings.waiting_time_2;
	//Get Transfers
	var transfers = getTransfers(station, track_from, propagateDown);
	//For each track that can be transferred to
	for (var track_to in transfers){
		if (propagateDown){
			var time_early = time_near + transfers[track_to];
			var time_late = time_near + transfers[track_to] + time_span;
			trips = trips.concat(getDepartingTrains(dayType, station, track_to, $unused, time_early, time_late, true));
		}else{
			var time_late = time_near - transfers[track_to];
			var time_early = time_near - transfers[track_to] - time_span;
			trips = trips.concat(getArrivingTrains(dayType, station, track_to, $unused, time_early, time_late, true));
		}
	}
	return trips;
};

exports.getConnectingTrains = getConnectingTrains;

//getFirstTrains (the train nearest to the specified trip start or end time)

var getFirstTrains = function(dayType, station, $unused, time_near, propagateDown){
	var trips = [];
	var time_span = global.planner.settings.waiting_time_1;
	//Get tracks
	var tracks = global.stations[station].tracks;
	for (var i in tracks){
		if (propagateDown){
			var time_early = time_near;
			var time_late = time_near + time_span;
			trips = trips.concat(getDepartingTrains(dayType, station, tracks[i], $unused, time_early, time_late, false));
		}else{
			var time_late = time_near;
			var time_early = time_near - time_span;
			trips = trips.concat(getArrivingTrains(dayType, station, tracks[i], $unused, time_early, time_late, false));
		}
	}
	return trips;
};

exports.getFirstTrains = getFirstTrains;