var TPF = require("./TripPlanner_functions.js");

exports.tripPlanner = function(dayType, station1, station2, time, propagateDown){
	//Propagate down
	if (propagateDown){
		var list = getTrips(dayType, station1, time, true)[station2];
	}
	//Propagate up
	else{
		var list = getTrips(dayType, station2, time, false)[station1];
	}
	//Get Array
	var result = filterResults(list, propagateDown);
	return result;
};

/**
 * getTrips(dayType, station, time)
 * Result format:
 * result[station][noOfTrips]: {#} //1 ~ N for non-liner trips, 0 for liner trips
 * {#}[startTime, endTime, timeSpent, timeSpent_mins, timeSpentOnTrain, timeSpentOnTrain_mins, timeSpentOnLiner, transfers, linerUses, distance]
 * {#}[trips][tripNo, trainType, from, from_track, board, board_hm, to, to_track, alight, distance]
 */

/**
 * Propagate Down
 */

var getTrips = function(dayType, station, time, propagateDown){ //Beginning station and time
	
	var maxTransfers = global.planner.settings.max_transfers;
	//Prepare object
	var obj = {};
	for (var i in global.stations){
		var stationID = global.stations[i].id;
		obj[stationID] = [];
		for (var j = 0; j <= maxTransfers + 1; j++){
			obj[stationID].push(null);
		}
	}

	//Function try taking train
	var tryTakingTrain = function(dayType, tripNo, station, propagateDown, transfersLeft, linerUsesLeft, index, tripsArray){
		//Get the trip by tripNo
		var myTrip = global.trips[dayType][tripNo];
		//If liner taken or not allowed --> break
		if (global.trainTypes[myTrip.trainType].liner){
			linerUsesLeft--;
			if (linerUsesLeft < 0) return null;
		}
		//Reduce number of transfers
		transfersLeft--;
		//Get index of my station
		var stationIndex = myTrip.timetable.findIndex(function(item){ return item.stop == station; });
		//If alight only (PD) board only (PU) --> break
		if (propagateDown){
			if (myTrip.timetable[stationIndex].alightOnly) return null;
		}else{
			if (myTrip.timetable[stationIndex].boardOnly) return null;
		}
		//PD: for each station after
		var distance = 0;
		var stops = 0;
		if (propagateDown){
			for (var i = stationIndex + 1; i < myTrip.timetable.length; i++){
				//Accumulate distance
				var line = myTrip.timetable[i-1].line;
				var stopIndexInLine = chooseOne(myTrip.timetable[i].stopIndexInLinePrev, myTrip.timetable[i].stopIndexInLine);
				var stopIndexInLinePrev = myTrip.timetable[i-1].stopIndexInLine;
				if (global.lines[line].stations[stopIndexInLine] == null) console.log(["stopIndexInLine", line, stopIndexInLine]);
				if (global.lines[line].stations[stopIndexInLinePrev] == null) console.log(["stopIndexInLinePrev", line, stopIndexInLine]);
				distance += Math.abs(global.lines[line].stations[stopIndexInLine].mileage - global.lines[line].stations[stopIndexInLinePrev].mileage);
				distance = Math.round(distance * 10) / 10;
				//Check if this station has arrive time
				if (myTrip.timetable[i].arrive != null){
					stops++;
					//Check if this station is alightable
					if (!myTrip.timetable[i].boardOnly){
						var station2 = myTrip.timetable[i].stop;
						//Try adding the trip into a new trips array
						var tripsArrayNew = tripsArray.slice(0);
						tripsArrayNew.push({
							tripNo: tripNo, trainType: myTrip.trainType,
							from: station, from_track: myTrip.timetable[stationIndex].track,
							board: myTrip.timetable[stationIndex].depart_ss, board_hm: myTrip.timetable[stationIndex].depart,
							to: station2, to_track: myTrip.timetable[i].track,
							alight: myTrip.timetable[i].arrive_ss, alight_hm: myTrip.timetable[i].arrive,
							distance: distance, stops: stops,
						});
						//Convert to object
						var tripsObjNew = summarizeTrip(tripsArrayNew);
						//If better than original than replace & propagate
						if (isBetterTrip(obj[station2][index], tripsObjNew, true)){
							obj[station2][index] = tripsObjNew;
							//Propagate to next connecting train
							if (transfersLeft >= 0){
								var $time = myTrip.timetable[i].arrive_ss;
								var $track = myTrip.timetable[i].track;
								var connectingTrains = TPF.getConnectingTrains(dayType, station2, $track, null, $time, propagateDown);
								//For each connecting trains, try transfer
								for (var j in connectingTrains){
									tryTakingTrain(dayType, connectingTrains[j].tripNo, station2, propagateDown, transfersLeft, linerUsesLeft, index, tripsArrayNew);
								}
							}
						}
					}
				}
			}
		}
		//PU: for each station before
		else{
			for (var i = stationIndex - 1; i >= 0; i--){
				//Accumulate distance
				var line = myTrip.timetable[i].line;
				var stopIndexInLine = myTrip.timetable[i].stopIndexInLine;
				var stopIndexInLineNext = chooseOne(myTrip.timetable[i+1].stopIndexInLinePrev, myTrip.timetable[i+1].stopIndexInLine);
				distance += Math.abs(global.lines[line].stations[stopIndexInLineNext].mileage - global.lines[line].stations[stopIndexInLine].mileage);
				distance = Math.round(distance * 10) / 10;
				//Check if this station has depart time
				if (myTrip.timetable[i].depart != null){
					stops++;
					//Check if this station is alightable
					if (!myTrip.timetable[i].alightOnly){
						var station2 = myTrip.timetable[i].stop;
						//Try adding the trip into a new trips array
						var tripsArrayNew = tripsArray.slice(0);
						tripsArrayNew.unshift({
							tripNo: tripNo, trainType: myTrip.trainType,
							from: station2, from_track: myTrip.timetable[i].track,
							board: myTrip.timetable[i].depart_ss, board_hm: myTrip.timetable[i].depart,
							to: station, to_track: myTrip.timetable[stationIndex].track,
							alight: myTrip.timetable[stationIndex].arrive_ss, alight_hm: myTrip.timetable[stationIndex].arrive,
							distance: distance, stops: stops,
						});
						//Convert to object
						var tripsObjNew = summarizeTrip(tripsArrayNew);
						//If better than original than replace & propagate
						if (isBetterTrip(obj[station2][index], tripsObjNew, false)){
							obj[station2][index] = tripsObjNew;
							//Propagate to next connecting train
							if (transfersLeft >= 0){
								var $time = myTrip.timetable[i].depart_ss;
								var $track = myTrip.timetable[i].track;
								var connectingTrains = TPF.getConnectingTrains(dayType, station2, $track, null, $time, propagateDown);
								//For each connecting trains, try transfer
								for (var j in connectingTrains){
									tryTakingTrain(dayType, connectingTrains[j].tripNo, station2, propagateDown, transfersLeft, linerUsesLeft, index, tripsArrayNew);
								}
							}
						}
					}
				}
			}
		}
		//End of function
	};

	//Get the fist train (or last train for PU)
	var firstTrains = TPF.getFirstTrains(dayType, station, null, time, propagateDown);
	for (var i in firstTrains){
		var tripNo = firstTrains[i].tripNo;
		//Try taking the train (liner allowed)
		tryTakingTrain(dayType, tripNo, station, propagateDown, maxTransfers, 1, 0, []);
		//Try taking the train (liner not allowed)
		for (var j = 0; j <= maxTransfers; j++){
			tryTakingTrain(dayType, tripNo, station, propagateDown, j, 0, j+1, []);
		}
	}
	//Finish, return the object
	return obj;
};

/**
 * Filter results:
 * 1a. For liner trip, if it is (travel_time_deviation_liner in seconds) over the shortest trip (endTime - startTime), discard it
 * 1b. If the liner trip has no liner, also discard it
 * 2. For each other trip, if it is (travel_time_deviation in seconds) over the shortest trip (endTime - startTime), discard it
 * 3. For trips with more transfers, if it is not "better" than that with fewer transfers, discard it
 */

var filterResults = function(list, propagateDown){
	//Obtain shortest travel time
	var minTimeSpent = Infinity;
	for (var i = 1; i < list.length; i++){
		if (list[i] != null) if (list[i].timeSpent < minTimeSpent) minTimeSpent = list[i].timeSpent;
	}
	//(1)
	if (list[0] != null){
		if (list[0].timeSpent - minTimeSpent > global.planner.settings.travel_time_deviation_liner) list[0].filtered = 1;
		else if (list[0].linerUses == 0) list[0].filtered = 1;
	}
	//(2 & 3)
	for (var i = 1; i < list.length; i++){
		if (list[i] != null){
			if (list[i].timeSpent - minTimeSpent > global.planner.settings.travel_time_deviation) list[i].filtered = 2;
			if (i > 1) if (!isBetterTrip(list[i-1], list[i], propagateDown)) list[i].filtered = 3;
		}
	}
	//Move unfiltered items to new list (list2)
	var list2 = [];
	for (var i in list){
		if (list[i] != null) if (list[i].filtered == null) list2.push(list[i]);
	}
	//Sort remaining trips
	list2.sort(function(a, b){
		var c = isBetterTrip(a, b, this.propagateDown, true);
		if (c == null) return 0;
		return c ? 1 : -1;
	}.bind({propagateDown: propagateDown}));
	//Return the list
	return list2;
};

/**
 * Summarize trip (convert the trip array to an object)
 */

var summarizeTrip = function(trips){
	var startTime = trips[0].board;
	var endTime = trips[trips.length - 1].alight;
	var timeSpentOnTrain = function(){
		var sum = 0;
		for (var i in trips) sum += (trips[i].alight - trips[i].board);
		return sum;
	}();
	var distance = function(){
		var sum = 0;
		for (var i in trips) sum += trips[i].distance;
		return Math.round(sum * 10) / 10;
	}();
	var stops = function(){
		var sum = 0;
		for (var i in trips) sum += trips[i].stops;
		return sum;
	}();
	var linerInfo = function(){
		var timeSpent = 0;
		var uses = 0;
		for (var i in trips){
			if (global.trainTypes[trips[i].trainType].liner){
				timeSpent += (trips[i].alight - trips[i].board);
				uses ++;
			}
		}
		return {timeSpent: timeSpent, uses: uses};
	}();
	return {
		startTime: startTime,
		endTime: endTime,
		timeSpent: endTime - startTime,
		timeSpent_mins: Math.round((endTime - startTime) / 60),
		timeSpentOnTrain: timeSpentOnTrain,
		timeSpentOnTrain_mins: Math.round(timeSpentOnTrain / 60),
		timeSpentOnLiner: linerInfo.timeSpent,
		transfers: trips.length - 1,
		linerUses: linerInfo.uses,
		distance: distance,
		trips: trips,
		stops: stops,
	};
};

/**
 * isBetterTrip(oldTrip, newTrip, propagateDown)
 * 1a. Using liner (unless linerHasNoPriority)
 * 1b. For trip using liner, liner spends up a larger proportion of the whole journey
 * 2. Earlier end time (PD) / Later start time (PU)
 * 3. Shorter travel time
 * 4. Less transfers
 * 5. Longer time staying on train
 */

var isBetterTrip = function(oldTrip, newTrip, propagateDown, linerHasNoPriority){
	if (oldTrip == null) return true;
	//0
	/*if (newTrip.linerUses > 0){
		if (newTrip.transfers > 2) return false;
		if (newTrip.transfers == 2) if (!global.trainTypes[newTrip.trips[1].trainType].liner) return false;
	}*/
	//1
	if (!linerHasNoPriority){
		if (newTrip.linerUses > oldTrip.linerUses) return true;
		if (newTrip.linerUses < oldTrip.linerUses) return false;
	}
	if (newTrip.linerUses > 0 && oldTrip.linerUses > 0){
		var a = newTrip.timeSpentOnLiner / newTrip.timeSpent;
		var b = oldTrip.timeSpentOnLiner / oldTrip.timeSpent;
		if (a > b) return true;
		if (a < b) return false;
	}
	//2
	if (propagateDown){
		if (newTrip.endTime < oldTrip.endTime) return true;
		if (newTrip.endTime > oldTrip.endTime) return false;
	}else{
		if (newTrip.startTime > oldTrip.startTime) return true;
		if (newTrip.startTime < oldTrip.startTime) return false;
	}
	//3
	if (newTrip.timeSpent < oldTrip.timeSpent) return true;
	if (newTrip.timeSpent > oldTrip.timeSpent) return false;
	//4
	if (newTrip.transfers < oldTrip.transfers) return true;
	if (newTrip.transfers > oldTrip.transfers) return false;
	//5
	if (newTrip.timeSpentOnTrain > oldTrip.timeSpentOnTrain) return true;
	if (newTrip.timeSpentOnTrain < oldTrip.timeSpentOnTrain) return false;
}

/**
 * Misc Functions
 */

var chooseOne = function(a, b){
	if (a != null) return a;
	return b;
}