/**
 * /api/lines_stations/
 */

exports.api_lines_stations = function(req, res, next){
	if (!global.dataAvailable){
		res.send({error: true});
	}else{
		var arr = [];
		for (var line in global.lines){
			arr.push(getLineInformation(line, req, true));
		}
		res.send(arr);
	}
};

/**
 * /api/stations/:line/
 */

exports.api_stations = function(req, res, next){
	if (!global.dataAvailable){
		res.send({error: true});
	}else{
		if (global.lines[req.params.line] != null){
			var obj = getLineInformation(req.params.line, req, false);
		}else{
			var obj = {error: true};
		}
		res.send(obj);
	}
};

/**
 * /timetable/
 */

exports.timetable_station = function(req, res, next){
	if (!global.dataAvailable){
		res.send("Error.");
	}else{
		req.query["line-color"] = true;
		req.query["station-code-icon"] = true;
		req.query["train-type"] = true;
		req.query["train-type-color"] = true;
		var arr = [];
		for (var line in global.lines){
			arr.push(getLineInformation(line, req, true));
		}
		var obj = {
			data: arr,
			req: {cookies: req.cookies, params: req.params, query: req.query},
		}
		//Station List
		if (req.params.station == null){
			res.render(this.template, obj);
		}
		//Details of a Station
		else if (global.stations[req.params.station] != null){
			obj.station = global.stations[req.params.station];
			res.render(this.template, obj);
		}else{
			res.send("Error.");
		}
	}
};

exports.trip_planner_station = function(req, res, next){
	if (!global.dataAvailable){
		res.send("Error.");
	}else{
		var arr = [];
		for (var line in global.lines){
			arr.push(getLineInformation(line, req, true));
		}
		var obj = {
			data: arr,
			req: {cookies: req.cookies, params: req.params, query: req.query},
		}
		res.render(this.template, obj);
	}
};

//Common Function

var getLineInformation = function(line, req, showID){
	//Line
	var line_color = (req.query["line-color"] != null);
	var station_code_icon = (req.query["station-code-icon"] != null);
	var train_type = (req.query["train-type"] != null);
	var train_type_color = (req.query["train-type-color"] != null);
	var obj = {
		id: line,
		name: global.lines[line].name,
	};
	if (!showID) delete obj.id;
	if (line_color) obj.color = global.lines[line].color;
	if (train_type){
		obj.types = global.lines[line].types;
		var types_order = function($){
			var obj = {};
			for (var i in $){
				obj[$[i]] = parseInt(i);
			}
			return obj;
		}(obj.types);
	}
	if (train_type_color) obj.types_colors = function(types){
		var obj = {};
		for (var i in types) obj[types[i]] = global.trainTypes[types[i]].color;
		return obj;
	}(global.lines[line].types);
	//Stations
	obj.stations = [];
	for (var i = 0; i < global.lines[line].stations.length; i++){
		var station = global.lines[line].stations[i].id;
		var typesInStation = global.lines[line].stations[i].types;
		if (typesInStation == null) typesInStation = [];
		var typesInStation2 = global.lines[line].stations[i].types2;
		if (typesInStation2 == null) typesInStation2 = [];
		var obj2 = {
			id: station,
			code: global.stations[station].code,
			code1: global.stations[station].code1,
			code2: global.stations[station].code2,
			name: global.stations[station].name,
		};
		if (station_code_icon) obj2.stationCodeIcon = global.stations[station].stationCodeIcon;
		if (train_type){
			obj2.types = typesInStation;
			obj2.types2 = typesInStation2;
			obj2.types_show = function(types, types2, orders){
				var arr = [];
				for (var i in orders) arr.push(0);
				for (var i in types) arr[orders[types[i]]] = 1;
				for (var i in types2) arr[orders[types2[i]]] = 2;
				return arr;
			}(obj2.types, obj2.types2, types_order);
		}
		obj.stations.push(obj2);
	}
	//Return
	return obj;
};

/**
 * /api/stations/
 */

exports.api_stations_all = function(req, res, next){
	if (!global.dataAvailable){
		res.send({error: true});
	}else{
		var station_code_icon = (req.query["station-code-icon"] != null);
		var tracks = (req.query["tracks"] != null);
		var arr = [];
		for (var station in global.stations){
			var obj = {
				id: station,
				code: global.stations[station].code,
				code1: global.stations[station].code1,
				code2: global.stations[station].code2,
				name: global.stations[station].name,
			};
			if (station_code_icon) obj.stationCodeIcon =  global.stations[station].stationCodeIcon;
			if (tracks) obj.tracks =  global.stations[station].tracks;
			arr.push(obj);
		}
		res.send(arr);
	}
};

/**
 * /api/lines/
 */

exports.api_lines_only = function(req, res, next){
	if (!global.dataAvailable){
		res.send({error: true});
	}else{
		var line_color = (req.query["line-color"] != null);
		var arr = [];
		for (var line in global.lines){
			arr.push(function(line){
				var obj = {
					id: line,
					name: global.lines[line].name,
				};
				if (line_color) obj.color = global.lines[line].color;
				return obj;
			}(line));
		}
		res.send(arr);
	}
};