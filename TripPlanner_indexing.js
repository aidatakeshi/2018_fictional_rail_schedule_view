/**
 * Create indexing for routeplanner use:
 * global.timetable[dayType][station][track].arrive = [{time: 86400, trip: "tripNo"}];
 * global.timetable[dayType][station][track].depart = [{time: 86400, trip: "tripNo"}];
 * global.lines[line].stationIndex[station] = index;
 * global.fares.stationSpecialFare[station] = "type";
 * global.stations[station].lines = ["line"];
 */

var initTimetable = function(){
	global.timetable = {
		WK: prepareTimetable("WK"),
		PH: prepareTimetable("PH"),
	}
};

var prepareTimetable = function(dt){
	var obj = {};
	//Set up object structure
	for (var station in global.stations){
		obj[station] = {};
		for (var i in global.stations[station].tracks){
			var track = global.stations[station].tracks[i];
			obj[station][track] = {arrive: [], depart: []};
		}
	}
	//Fetch timetable
	for (var trip in global.trips[dt]){
		var $ = global.trips[dt][trip];
		for (var j in $.timetable){
			var $$ = $.timetable[j];
			if ($$ != null){
				if ($$.depart != null){
					if (obj[$$.stop][$$.track] == null) console.log([$$.stop, $$.track]);
					else obj[$$.stop][$$.track].depart.push({time: $$.depart_ss, line: $$.line, upbound: $$.upbound, trip: $.tripNo});
				}
				if ($$.arrive != null){
					var $$_1 = $.timetable[j-1];
					if (obj[$$.stop][$$.track] == null) console.log([$$.stop, $$.track]);
					else obj[$$.stop][$$.track].arrive.push({time: $$.arrive_ss, line: $$_1.line, upbound: $$_1.upbound, trip: $.tripNo});
				}
			}
		}
	}
	//Sort timetable
	for (var station in obj){
		for (var track in obj[station]){
			obj[station][track].depart.sort(function(a, b){	//Depart: from early to late
				if (a.time < b.time) return -1;
				if (a.time > b.time) return 1;
				return 0;
			});
			obj[station][track].arrive.sort(function(a, b){	//Arrive: from late to early
				if (a.time < b.time) return 1;
				if (a.time > b.time) return -1;
				return 0;
			});
		}
	}
	//Return object
	return obj;
};

var prepareStationIndex = function(){
	for (var station in global.stations){
		global.stations[station].lines = [];
	}
	for (var line in global.lines){
		global.lines[line].stationIndex = function($, line){
			var obj = {};
			for (var i = 0; i < $.length; i++){
				var station = $[i].id;
				obj[station] = i;
				if (global.stations[station] == null) console.log(["station", station]);
				global.stations[station].lines.push(line);
			}
			return obj;
		}(global.lines[line].stations, line);
	}
};

var prepareFares = function(){
	global.fares.stationSpecialFare = {};
	for (var station in global.stations){
		global.fares.stationSpecialFare[station] = "default";
	}
	for (var i in global.fares.specialFareStations){
		var from = global.fares.specialFareStations[i].from;
		var to = global.fares.specialFareStations[i].to;
		var fareType = global.fares.specialFareStations[i].fareType;
		for (var j = from; j <= to; j++){
			global.fares.stationSpecialFare[j+""] = fareType;
		}
	};
};

exports.init = function(){
	initTimetable();
	prepareStationIndex();
	prepareFares();
}