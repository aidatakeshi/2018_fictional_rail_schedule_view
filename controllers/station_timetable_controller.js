/**
 * /api/timetable/station/:station/:line/:direction/
 */

exports.api_timetable_1 = function(req, res, next){
	if (!global.dataAvailable){
		res.send({error: true});
	}
	else if (req.params.direction != "UP" && req.params.direction != "DN") res.send({error: true});
	else if (global.stations[req.params.station] == null) res.send({error: true});
	else if (global.lines[req.params.line] == null) res.send({error: true});
	else{
		var obj = {
			line: getLineInfo(req),
			station: getStationInfo(req),
			timetable: {
				WK: getTimetable("WK", req),
				PH: getTimetable("PH", req),
			},
		};
		res.send(obj);
	}
};

/**
 * /api/timetable/station/:station/:line/:direction/:dayType
 */

exports.api_timetable_2 = function(req, res, next){
	if (!global.dataAvailable){
		res.send({error: true});
	}
	else if (req.params.dayType != "WK" && req.params.dayType != "PH") res.send({error: true});
	else if (req.params.direction != "UP" && req.params.direction != "DN") res.send({error: true});
	else if (global.stations[req.params.station] == null) res.send({error: true});
	else if (global.lines[req.params.line] == null) res.send({error: true});
	else{
		var obj = {
			line: getLineInfo(req),
			station: getStationInfo(req),
			timetable: getTimetable(req.params.dayType, req),
		};
		res.send(obj);
	}
};

/**
 * /timetable/station/:station/:line/:direction/:dayType
 */

exports.timetable_station_details = function(req, res, next){
	if (!global.dataAvailable){
		res.send("Error.");
	}
	else if (req.params.dayType != "WK" && req.params.dayType != "PH") res.send("Error.");
	else if (req.params.direction != "UP" && req.params.direction != "DN") res.send("Error.");
	else if (global.stations[req.params.station] == null) res.send("Error.");
	else if (global.lines[req.params.line] == null) res.send("Error.");
	else{
		req.query["train-type-info"] = true;
		req.query["dest-name"] = true;
		req.query["consist"] = true;
		req.query["station-code-icon"] = true;
		req.query["line-color"] = true;
		var obj = {
			line: getLineInfo(req),
			station: getStationInfo(req),
			timetable: getTimetable(req.params.dayType, req),
			req: {
				params: req.params,
				cookies: req.cookies,
			},
			sch_change: global.timetablePDF.sch_updated,
		};
		res.render("timetable_station_details", obj);
	}
};

/**
 * /pdf/:station-:line-:direction.pdf
 */

var pdf_controller = require('../pdf/pdf-timetable');

exports.timetable_station_pdf = function(req, res, next){
	if (!global.dataAvailable){
		res.send("Error.");
	}
	else if (req.params.direction != "UP" && req.params.direction != "DN") res.send("Error.");
	else if (global.stations[req.params.station] == null) res.send("Error.");
	else if (global.lines[req.params.line] == null) res.send("Error.");
	else{
		req.query["consist"] = true;
		req.query["dest-name"] = true;
		req.query["train-type-info"] = true;
		req.query["line-color"] = true;
		var data = {
			line: getLineInfo(req),
			station: getStationInfo(req),
			timetable: {
				WK: getTimetable("WK", req),
				PH: getTimetable("PH", req),
			},
			sch_change: global.timetablePDF.sch_updated,
			params: req.params,
		};
		if (req.query.fuck != null) res.send(data);
		else if (data.timetable.WK.length == 0 || data.timetable.PH.length == 0) res.send("Error.");
		else pdf_controller.createPDFTimetable(res, data);
	};
};

//Common Function
var getLineInfo = function(req){
	var line = req.params.line;
	if(req.params.direction == "UP"){
		var this_direction = global.lines[line].stations[global.lines[line].stations.length - 1].id;
		var oppo_direction = global.lines[line].stations[0].id;
	}else{
		var this_direction = global.lines[line].stations[0].id;
		var oppo_direction = global.lines[line].stations[global.lines[line].stations.length - 1].id;
	}
	var obj = {
		id: line,
		name: global.lines[line].name,
		this_direction: this_direction,
		this_direction_name: global.stations[this_direction].name,
		oppo_direction: oppo_direction,
		oppo_direction_name: global.stations[oppo_direction].name,
	};
	if (req.query["line-color"] != null) obj.color = global.lines[line].color;
	return obj;
};

var getStationInfo = function(req){
	var station = req.params.station;
	var obj = {
		id: station,
		code: global.stations[station].code,
		code1: global.stations[station].code1,
		code2: global.stations[station].code2,
		name: global.stations[station].name,
		stationCodeIcon: global.stations[station].stationCodeIcon,
	};
	if (req.query["station-code-icon"] != null) obj.stationCodeIcon = global.stations[station].stationCodeIcon;
	return obj;
};

var getTimetable = function(dt, req){
	var line = req.params.line;
	var station = req.params.station;
	var upbound = (req.params.direction == "UP");
	var arrival = (req.query["arrival"] != null);
	var arr = [];
	//Fetch the array
	for (var trip in global.trips[dt]){
		var $ = global.trips[dt][trip];
		for (var j in $.timetable){
			var $$ = $.timetable[j];
			var addFlag = false;
			if ($$.stop == station && $$.line == line && $$.upbound == upbound){
				if ($$.depart != null) addFlag = true;
				else if ($$.arrive != null && arrival) addFlag = true;
			}
			if (addFlag){
				arr.push(getTimetableItem(trip, $, $$, req));
			}
		}
	}
	//Sort array
	arr.sort(function(a,b){
		if (a.depart_ss < b.depart_ss) return -1;
		if (a.depart_ss > b.depart_ss) return +1;
		if (a.trainType_priority > b.trainType_priority) return -1;
		if (a.trainType_priority < b.trainType_priority) return +1;
		return 0;
	});
	//Return array
	return arr;
};

var getTimetableItem = function(trip, $, $$, req){
	var train_type_info = (req.query["train-type-info"] != null);
	var dest_name = (req.query["dest-name"] != null);
	var begin_name = (req.query["begin-name"] != null);
	var consist = (req.query["consist"] != null);
	var arrival = (req.query["arrival"] != null);
	var obj = {
		arrive: ($$.arrive != null) ? $$.arrive : "",
		arrive_ss: ($$.arrive != null) ? $$.arrive_ss : 0,
		depart: ($$.depart != null) ? $$.depart : "",
		depart_ss: ($$.depart != null) ? $$.depart_ss : 0,
		track: $$.track,
		tripNo: trip,
		refNo: $.refNo,
		trainType: $.trainType,
		trainType_priority: global.trainTypes[$.trainType].priority,
	};
	if (train_type_info){
		obj.trainType_name = global.trainTypes[$.trainType].name;
		obj.trainType_name_short = global.trainTypes[$.trainType].name_short;
		obj.trainType_color = global.trainTypes[$.trainType].color;
	}
	if (!arrival){
		delete obj.arrive;
		delete obj.arrive_ss;
	}
	obj.beginStop = $.beginStop;
	if (begin_name){
		obj.beginStop_name = global.stations[$.beginStop].name;
		obj.beginStop_name_short = global.stations[$.beginStop].name_short;
	}
	obj.terminateStop = $.terminateStop;
	if (dest_name){
		obj.terminateStop_name = global.stations[$.terminateStop].name;
		obj.terminateStop_name_short = global.stations[$.terminateStop].name_short;
	}
	if (consist){
		obj.consist = {
			remark: global.consistTypes[$.consist].remark,
			noOfCars: global.consistTypes[$.consist].noOfCars,
			others: global.consistTypes[$.consist].others,
		};
	}
	return obj;
};