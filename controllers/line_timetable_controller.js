
/**
 * /api/timetable/line/:line/:direction
 */

exports.api_timetable_1 = function(req, res, next){
	if (!global.dataAvailable){
		res.send({error: true});
	}
	else if (req.params.direction != "UP" && req.params.direction != "DN") res.send({error: true});
	else if (global.lines[req.params.line] == null) res.send({error: true});
	else{
		var obj = {
			line: getLineInfo(req),
			timetable: {
				WK: getTimetable("WK", req),
				PH: getTimetable("PH", req),
			},
		};
		res.send(obj);
	}
};

/**
 * /api/timetable/line/:line/:direction/:dayType
 */

exports.api_timetable_2 = function(req, res, next){
	if (!global.dataAvailable){
		res.send({error: true});
	}
	else if (req.params.dayType != "WK" && req.params.dayType != "PH") res.send({error: true});
	else if (req.params.direction != "UP" && req.params.direction != "DN") res.send({error: true});
	else if (global.lines[req.params.line] == null) res.send({error: true});
	else{
		var obj = {
			line: getLineInfo(req),
			timetable: getTimetable(req.params.dayType, req),
		};
		res.send(obj);
	}
};

/**
 * /timetable/line/:line/:direction/:dayType
 */

exports.timetable_line = function(req, res, next){
	if (!global.dataAvailable){
		res.send("Error.");
	}
	else if (req.params.dayType != "WK" && req.params.dayType != "PH") res.send("Error.");
	else if (req.params.direction != "UP" && req.params.direction != "DN") res.send("Error.");
	else if (global.lines[req.params.line] == null) res.send("Error.");
	else{
		req.query["station-name"] = true;
		req.query["station-code-icon"] = true;
		req.query["train-type-info"] = true;
		req.query["begin_name"] = true;
		req.query["dest_name"] = true;
		req.query["consist"] = true;
		var obj = {
			line: getLineInfo(req),
			timetable: (req.params.hour != null) ? getTimetable(req.params.dayType, req) : null,
			timeMenu: timeMenu(req.params.line, req.params.direction),
			req: {
				params: req.params,
				cookies: req.cookies,
			},
		};
		res.render("timetable_line_details", obj);
	}
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
	var obj = global.lines[line];
	obj.this_direction = this_direction;
	obj.this_direction_name = global.stations[this_direction].name;
	obj.oppo_direction = oppo_direction;
	obj.oppo_direction_name = global.stations[oppo_direction].name;
	for (var i in obj.stations){
		var station = obj.stations[i].id;
		if (req.query["station-name"] != null) obj.stations[i].name = global.stations[station].name;
		if (req.query["station-code-icon"] != null) obj.stations[i].stationCodeIcon = global.stations[station].stationCodeIcon;
	}
	if (req.query["station-name"] != null){
		obj.refTimeAt.UP.name =  global.stations[obj.refTimeAt.UP.station].name;
		obj.refTimeAt.DN.name =  global.stations[obj.refTimeAt.DN.station].name;
	}
	return obj;
};

var getTimetable = function(dt, req){
	var line = req.params.line;
	var upbound = (req.params.direction == "UP");
	var arr = [];
	//Hour
	var hour = parseInt(req.params.hour);
	if (isNaN(hour)) return [];
	if (hour <= 5){
		var hourMin = 0; var hourMax = 6;
	}else if (hour >= 25){
		var hourMin = 25; var hourMax = 30;
	}else{
		var hourMin = hour; var hourMax = hour+1;
	}
	//Fetch the array
	for (var trip in global.trips[dt]){
		var myTrip = global.trips[dt][trip];
		if (myTrip.refTime[line] >= hourMin && myTrip.refTime[line] < hourMax){
			var addFlag = false;
			for (var j in myTrip.timetable){
				var myTripStop = myTrip.timetable[j];
				if (myTripStop.line == line && myTripStop.upbound == upbound) addFlag = true;
			}
			if (addFlag) arr.push({...myTrip});
		}
	}
	//Sort array
	arr.sort(function(a,b){
		if (a.refTime[this.line] < b.refTime[this.line]) return -1;
		if (a.refTime[this.line] > b.refTime[this.line]) return +1;
		if (a.tripNo < b.tripNo) return -1;
		if (a.tripNo > b.tripNo) return +1;
		return 0;
	}.bind({line: line}));
	//Manipulate trip items in array
	for (var i in arr){
		arr[i] = manipulateTrip({...arr[i]}, req);
	}
	//Return array
	return arr;
};

var manipulateTrip = function(myTrip, req){
	var line = req.params.line;
	delete myTrip._id;
	myTrip.refTime = myTrip.refTime[line];
	if (req.query["train-type-info"] != null){
		myTrip.trainType_name = global.trainTypes[myTrip.trainType].name;
		myTrip.trainType_name_short = global.trainTypes[myTrip.trainType].name_short;
		myTrip.trainType_color = global.trainTypes[myTrip.trainType].color;
	}
	if (req.query["begin_name"] != null){
		myTrip.beginStop_name = global.stations[myTrip.beginStop].name;
		myTrip.beginStop_name_short = global.stations[myTrip.beginStop].name_short;
	}
	if (req.query["dest_name"] != null){
		myTrip.terminateStop_name = global.stations[myTrip.terminateStop].name;
		myTrip.terminateStop_name_short = global.stations[myTrip.terminateStop].name_short;
	}
	if (req.query["consist"] != null){
		myTrip.consist = {
			remark: global.consistTypes[myTrip.consist].remark,
			noOfCars: global.consistTypes[myTrip.consist].noOfCars,
			others: global.consistTypes[myTrip.consist].others,
		};
	}
	//For each stop
	myTrip.timetable2 = [];
	var stopIndexMin = Infinity;
	var stopIndexMax = 0;
	for (var i = myTrip.timetable.length - 1; i >= 0; i--){
		var linePrev = (myTrip.timetable[i].linePrev != null) ? myTrip.timetable[i].linePrev : myTrip.timetable[i].line;
		var lineNext = myTrip.timetable[i].line;
		if (linePrev == line){
			if (lineNext == line){
				//Type 1: both linePrev & line are valid
				myTrip.timetable2[myTrip.timetable[i].stopIndexInLine] = {
					arrive: myTrip.timetable[i].arrive,
					arrive_ss: myTrip.timetable[i].arrive_ss,
					depart: myTrip.timetable[i].depart,
					depart_ss: myTrip.timetable[i].depart_ss,
					pass: myTrip.timetable[i].pass,
					pass_ss: myTrip.timetable[i].pass_ss,
				};
				stopIndexMin = Math.min(stopIndexMin, myTrip.timetable[i].stopIndexInLine);
				stopIndexMax = Math.max(stopIndexMax, myTrip.timetable[i].stopIndexInLine);
			}else{
				//Type 2: only linePrev is valid
				myTrip.timetable2[myTrip.timetable[i].stopIndexInLinePrev] = {
					arrive: myTrip.timetable[i].arrive,
					arrive_ss: myTrip.timetable[i].arrive_ss,
					depart: "",
					depart_ss: -1,
					pass: myTrip.timetable[i].pass,
					pass_ss: myTrip.timetable[i].pass_ss,
				};
				stopIndexMin = Math.min(stopIndexMin, myTrip.timetable[i].stopIndexInLinePrev);
				stopIndexMax = Math.max(stopIndexMax, myTrip.timetable[i].stopIndexInLinePrev);
			}
		}else{
			if (lineNext == line){
				//Type 3: only lineNext is valid
				myTrip.timetable2[myTrip.timetable[i].stopIndexInLine] = {
					arrive: "",
					arrive_ss: -1,
					depart: myTrip.timetable[i].depart,
					depart_ss: myTrip.timetable[i].depart_ss,
					pass: myTrip.timetable[i].pass,
					pass_ss: myTrip.timetable[i].pass_ss,
				};
				stopIndexMin = Math.min(stopIndexMin, myTrip.timetable[i].stopIndexInLine);
				stopIndexMax = Math.max(stopIndexMax, myTrip.timetable[i].stopIndexInLine);
			}else{
				//Type 4: none is valid
			}
		}
	}
	for (var i = stopIndexMin; i < stopIndexMax; i++){
		if (myTrip.timetable2[i] == null) myTrip.timetable2[i] = {pass: true, pass_ss: -1};
	}
	myTrip.timetable = myTrip.timetable2;
	delete myTrip.timetable2;
	//Return array
	return myTrip;
}

var timeMenu = function(line, direction){
	var refTime = global.lines[line].refTimeAt[direction];
	var stationName = global.stations[refTime.station].name;
	var depart = refTime.depart;
	var arr = [];
	arr.push({value: 5, label: "[ ~ 5:59]", name: stationName, depart: depart});
	for (var i = 6; i <= 24; i++){
		arr.push({value: i, label: "[" + (i % 24) + ":00 ~ " + (i % 24) + ":59]", name: stationName, depart: depart});
	}
	arr.push({value: 25, label: "[1:00 ~ ]", name: stationName, depart: depart});
	return arr;
}