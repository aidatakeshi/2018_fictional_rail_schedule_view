var TP_trip = require("../TripPlanner_trip");
var TP_fare = require("../TripPlanner_fare");

/**
 * /api/trip-planner/:dayType/:from/:to/:TPType/:h/:m/
 * /api/trip-planner/:dayType/:from/:to/:TPType/
 */

exports.api_trip_planner = function(req, res, next){
	if (!global.dataAvailable){
		res.send({error: true});
	}else{
		var obj = getTripPlannerResult_withCache(req);
		res.send(obj);
	}
};

/**
 * /trip-planner/:dayType/:from/:to/:TPType/:h/:m/
 * /trip-planner/:dayType/:from/:to/:TPType/
 */

exports.trip_planner_results = function(req, res, next){
	if (!global.dataAvailable){
		res.send("Error");
	}else if (req.params["fareType"] != "T" && req.params["fareType"] != "I"){
		res.send("Error");
	}else{
		req.query["station-code-icon"] = true;
		req.query["station-name"] = true;
		req.query["train-type-info"] = true;
		req.query["train-destination"] = true;
		req.query["fares"] = true;
		//Obj
		var obj = getTripPlannerResult_withCache(req);
		obj.fareType = (req.params["fareType"] == "I") ? "IC" : "ticket";
		obj.req = {
			params: req.params,
			cookies: req.cookies,
		};
		obj.sch_change = global.timetablePDF.sch_updated;
		if (obj.error){
			res.send("Error");
		}else{
			res.render("trip_planner_results", obj);
		}
	}
};

//Common Function

var getTripPlannerResult_withCache = function(req){
	//Check if valid
	var dt = req.params.dayType;
	var from = req.params.from;
	var to = req.params.to;
	var tpt = req.params.TPType;
	var h = parseInt(req.params.h);
	var m = parseInt(req.params.m);
	if (dt != "WK" && dt != "PH") return {error: true};
	if (global.stations[from] == null) return {error: true};
	if (global.stations[to] == null) return {error: true};
	if (from == to) return {error: true};
	if (tpt != "D" && tpt != "A" && tpt != "F" && tpt != "L") return {error: true};
	else if ((tpt == "D" || tpt == "A") && (isNaN(h) || isNaN(m))) return {error: true};
	//Get cache string
	var cache_str = dt + " " + from + " " + to + " " + tpt + " " + h + " " + m + " ";
	if(req.query["station-code-icon"] != null) cache_str += "A";
	if(req.query["station-name"] != null) cache_str += "B";
	if (req.query["train-type-info"] != null) cache_str += "C";
	if(req.query["train-destination"] != null) cache_str += "D";
	if(req.query["fares"] != null) cache_str += "E";
	//If already in cache
	if (global.cache.trip_planner[cache_str]){
		return global.cache.trip_planner[cache_str];
	}
	//Else, place into cache
	else{
		var result = getTripPlannerResult(req);
		global.cache.trip_planner[cache_str] = result;
		global.cache.trip_planner_quota--;
		for (var cache_str in global.cache.trip_planner){
			if (global.cache.trip_planner_quota < 0){
				delete global.cache.trip_planner[cache_str];
				global.cache.trip_planner_quota++;
			}else{
				break;
			}
		}
		return result;
	}
};

var getTripPlannerResult = function(req){
	var dt = req.params.dayType;
	var from = req.params.from;
	var to = req.params.to;
	var tpt = req.params.TPType;
	var h = parseInt(req.params.h);
	var m = parseInt(req.params.m);
	//Get trip planner result
	var time = h * 3600 + m * 60;
	if (tpt == "D")			var result = TP_trip.tripPlanner(dt, from, to, time, true);
	else if (tpt == "F")	var result = TP_trip.tripPlanner(dt, from, to, 0, true);
	else if (tpt == "A")	var result = TP_trip.tripPlanner(dt, from, to, time, false);
	else if (tpt == "L")	var result = TP_trip.tripPlanner(dt, from, to, 86400 * 2, false);
	if (result == null) return {error: true};
	//Set up data object
	var data = {};
	//Add fancy items
	var station_code_icon = (req.query["station-code-icon"] != null);
	var station_name = (req.query["station-name"] != null);
	var train_type_info = (req.query["train-type-info"] != null);
	var train_destination = (req.query["train-destination"] != null);
	var fares = (req.query["fares"] != null);
	if (station_code_icon){
		data.from_stationCodeIcon = global.stations[from].stationCodeIcon;
		data.to_stationCodeIcon = global.stations[to].stationCodeIcon;
	}
	if (station_name){
		data.from_name = global.stations[from].name;
		data.from_code = global.stations[from].code;
		data.from_code1 = global.stations[from].code1;
		data.from_code2 = global.stations[from].code2;
		data.to_name = global.stations[to].name;
		data.to_code = global.stations[to].code;
		data.to_code1 = global.stations[to].code1;
		data.to_code2 = global.stations[to].code2;
	}
	for (var i in result){
		if (fares) result[i].basic_fare = TP_fare.getBasicFare(from, to);
		for (var j in result[i].trips){
			var tripNos = findCoupledTrains(result[i].trips[j].tripNo, result[i].trips[j].from, result[i].trips[j].to, dt);
			result[i].trips[j].tripNo = tripNos.join(",");
			var tripNo1 = tripNos[0];
			var tripNo2 = (tripNos[1] == null) ? tripNos[0] : tripNos[1];
			//
			if (station_code_icon){
				result[i].trips[j].from_stationCodeIcon = global.stations[result[i].trips[j].from].stationCodeIcon;
				result[i].trips[j].to_stationCodeIcon = global.stations[result[i].trips[j].to].stationCodeIcon;
			}
			if (station_name){
				result[i].trips[j].from_name = global.stations[result[i].trips[j].from].name;
				result[i].trips[j].from_code = global.stations[result[i].trips[j].from].code;
				result[i].trips[j].from_code1 = global.stations[result[i].trips[j].from].code1;
				result[i].trips[j].from_code2 = global.stations[result[i].trips[j].from].code2;
				result[i].trips[j].to_code = global.stations[result[i].trips[j].to].code;
				result[i].trips[j].to_code1 = global.stations[result[i].trips[j].to].code1;
				result[i].trips[j].to_code2 = global.stations[result[i].trips[j].to].code2;
				result[i].trips[j].to_name = global.stations[result[i].trips[j].to].name;
			}
			var consist = global.trips[dt][tripNo1].consist;
			if (train_type_info){
				result[i].trips[j].trainType_name = global.trainTypes[result[i].trips[j].trainType].name;
				result[i].trips[j].trainType_color = global.trainTypes[result[i].trips[j].trainType].color;
			}
			if (train_destination){
				var ts1 = global.trips[dt][tripNo1].terminateStop;
				var ts2 = global.trips[dt][tripNo2].terminateStop;
				if (ts1 == ts2){
					result[i].trips[j].train_dest_name = global.stations[ts1].name;
				}else{
					result[i].trips[j].train_dest_name = function(ts1, ts2){
						var obj = {};
						for (var i in ts1){
							obj[i] = ts1[i] + " / " + ts2[i];
						}
						return obj;
					}(global.stations[ts1].name, global.stations[ts2].name);
				}
			}
			//Liner
			if (global.consistTypes[consist].others.liner){
				result[i].trips[j].liner_fee = TP_fare.getLinerFee(result[i].trips[j].from, result[i].trips[j].to, result[i].trips[j].distance);
			}
			//First Class
			if (global.consistTypes[consist].others.reserved){
				result[i].trips[j].reserved_fee = TP_fare.getReservedFee(result[i].trips[j].from, result[i].trips[j].to, result[i].trips[j].distance);
			}
		}
	}
	data.result = result;
	//return result
	return data;
};

//Find Coupled Trains
var findCoupledTrains = function(tripNo, from, to, dt){
	//Find another paired trip no.
	for (var i in global.planner.check_coupled_trains){
		var $ = global.planner.check_coupled_trains[i];
		var replaceFrom = $.replaceFrom;
		var replaceTo = $.replaceTo;
		var strIndex = $.strIndex;
		if (tripNo.substr(strIndex, 1) == replaceFrom){
			var tripNoAlt = tripNo.substr(0, strIndex) + replaceTo + tripNo.substr(strIndex + 1);
		}
	}
	var tripNoAltAvailable = true;
	//Check if the paired trip actually exists
	if (tripNoAlt == null) return [tripNo];
	if (global.trips[dt][tripNoAlt] == null) return [tripNo];
	//Check if the paired trip has also the same stations
	var from_has = false;
	var to_has = false;
	for (var i in global.trips[dt][tripNoAlt].timetable){
		var myStop = global.trips[dt][tripNoAlt].timetable[i].stop;
		if (myStop == from) from_has = true;
		else if (myStop == to) to_has = true;
	}
	if (!from_has) return [tripNo];
	if (!to_has) return [tripNo];
	//Return no. pair
	if (tripNoAlt < tripNo) return [tripNoAlt, tripNo];
	return [tripNo, tripNoAlt];
}

/**
 * /api/last-train/:dayType/:station
 */

var TPLT = require("../TripPlanner_lastTrain.js");

exports.api_last_train = function(req, res, next){
	res.send(getLastTrainResult(req));
};

exports.last_train_results = function(req, res, next){
	req.query["station-code-icon"] = true;
	req.query["station-name"] = true;
	var obj = getLastTrainResult(req);
	if (obj.error){
		res.send("Error");
	}else{
		obj.lines = global.lines;
		obj.req = {
			params: req.params,
			cookies: req.cookies,
		};
		res.render("last_train_details", obj);
	}
}

//Common Function
var getLastTrainResult = function(req){
	var dayType = req.params.dayType;
	var station = req.params.station;
	//Check if valid
	if (dayType != "WK" && dayType != "PH") return {error: true};
	if (global.stations[station] == null) return {error: true};
	//Get object
	var obj = {
		to: {},
		lastTrainFrom: TPLT.getLastTrains(dayType, station),
	}
	//Entertain queries
	if (req.query["station-code-icon"] != null){
		for (var s_from in obj.lastTrainFrom){
			obj.lastTrainFrom[s_from].stationCodeIcon = stations[s_from].stationCodeIcon;
			obj.to.stationCodeIcon = stations[station].stationCodeIcon;
		}
	}
	if (req.query["station-name"] != null){
		for (var s_from in obj.lastTrainFrom){
			obj.lastTrainFrom[s_from].name = stations[s_from].name;
			obj.lastTrainFrom[s_from].code = stations[s_from].code;
			obj.lastTrainFrom[s_from].code1 = stations[s_from].code1;
			obj.lastTrainFrom[s_from].code2 = stations[s_from].code2;
			obj.to.name = stations[station].name;
			obj.to.code = stations[station].code;
			obj.to.code1 = stations[station].code1;
			obj.to.code2 = stations[station].code2;
		}
	}
	//Return result
	return obj;
};