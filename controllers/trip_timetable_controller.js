/**
 * /api/timetable/trip/:trip/:direction/
 */

exports.api_timetable = function(req, res, next){
	if (!global.dataAvailable){
		res.send({error: true});
	}else{
		var obj = getTrainTrip(req, req.params.trip);
		res.send(obj);
	}
};

/**
 * /api/timetable/trips/:trips/:direction/
 */

exports.api_timetable_multi = function(req, res, next){
	if (!global.dataAvailable){
		res.send({error: true});
	}else{
		var obj = {};
		var trips = req.params.trips.split(",");
		for (var i in trips){
			obj[trips[i]] = getTrainTrip(req, trips[i]);
		}
		res.send(obj);
	}
};

/**
 * /timetable/trip/:trips/:dayType
 */

exports.trip_details = function(req, res, next){
	if (!global.dataAvailable){
		res.send("Error");
	}
	else{
		var trips = req.params.trips.split(",");
		var obj = {
			trips: {},
			count: trips.length,
			sch_change: global.timetablePDF.sch_updated,
		};
		req.query["station-code-icon"] = true;
		req.query["station-name"] = true;
		req.query["station-code-icon"] = true;
		req.query["line-info"] = true;
		var error = false;
		for (var i in trips){
			var result = getTrainTrip(req, trips[i]);
			obj.trips[trips[i]] = result;
			if (result.error) error = true;
		}
		obj.req = {
			params: req.params,
			query: req.query,
			cookies: req.cookies,
		};
		if (error) res.send("Error");
		else res.render("timetable_trip", obj);
	}
}

//Common Function

var getTrainTrip = function(req, tripNo){
	var dt = req.params.dayType;
	if (dt != "WK" && dt != "PH") return {error: true};
	else if (global.trips[dt][tripNo] == null) return {error: true};
	else{
		var hide_pass_stops = (req.query["hide-pass-stops"] != null);
		var line_info = (req.query["line-info"] != null);
		var $ = global.trips[dt][tripNo];
		var obj = {
			tripNo: $.tripNo,
			refNo: $.refNo,
			trainType: $.trainType,
			trainType_name: global.trainTypes[$.trainType].name,
			trainType_name_short: global.trainTypes[$.trainType].name_short,
			trainType_color: global.trainTypes[$.trainType].color,
			upbound: $.upbound,
			distance: $.distance,
			distance_mugikyu: $.distance_mugikyu,
			consist: global.consistTypes[$.consist],
		};
		if (line_info){
			obj.lineNames = {};
			obj.lineColors = {};
		}
		obj.timetable = [];
		//Timetable
		for (var i = 0; i < $.timetable.length; i++){
			//Intepolate bypassed stops if !hide_pass_stops
			if (!hide_pass_stops && i > 0){
				var stop1 = $.timetable[i-1].stop;
				var stopIndex = $.timetable[i-1].stopIndexInLine;
				var stop2 = $.timetable[i].stop;
				var line = $.timetable[i-1].line;
				var upbound = $.timetable[i-1].upbound;
				var indexStep = upbound ? +1 : -1;
				stopIndex += indexStep;
				while (global.lines[line].stations[stopIndex] != null && global.lines[line].stations[stopIndex].id != stop2){
					obj.timetable.push({
						stop: global.lines[line].stations[stopIndex].id,
						line: line,
						upbound: upbound,
						bypass: true,
					});
					stopIndex += indexStep;
				}
				//Update if line_info
				if (line_info){
					obj.lineNames[line] = global.lines[line].name;
					obj.lineColors[line] = global.lines[line].color;
				};
			}
			//Push Item
			if ($.timetable[i].arrive != null || $.timetable[i].depart != null || !hide_pass_stops){
				obj.timetable.push(function($){
					var $obj = {};
					for (var i in $) $obj[i] = $[i];
					return $obj;
				}($.timetable[i]));
			}
		}
		//Additional information for each timetable item
		var station_code_icon = (req.query["station-code-icon"] != null);
		var station_name = (req.query["station-name"] != null);
		for (var i in obj.timetable){
			var stop = obj.timetable[i].stop;
			if (station_name){
				obj.timetable[i].name = global.stations[stop].name;
				obj.timetable[i].name_short = global.stations[stop].name_short;
				obj.timetable[i].code = global.stations[stop].code;
				obj.timetable[i].code1 = global.stations[stop].code1;
				obj.timetable[i].code2 = global.stations[stop].code2;
			}
			if (station_code_icon){
				obj.timetable[i].stationCodeIcon = global.stations[stop].stationCodeIcon;
			}
		}
		//Return object
		return obj;
	}
};