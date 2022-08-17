/**
 * global.runNos.WK/PH.list
 * global.runNos.WK/PH.runs[runNo][i][..]
 */

exports.init = function(){
	global.runNos = {
		WK: prepareList("WK"),
		PH: prepareList("PH"),
	}
};

var prepareList = function(dt){
	var list = [];
	var runs = {};
	//Search in trips list
	for (var i in global.trips[dt]){
		var runNoPair = getRunNoPairFromTripNo(global.trips[dt][i].tripNo);
		if (runs[runNoPair] == null){
			runs[runNoPair] = [];
			list.push(runNoPair);
		}
		runs[runNoPair].push({
			tripNo: global.trips[dt][i].tripNo,
			beginStop: global.trips[dt][i].beginStop,
			terminateStop: global.trips[dt][i].terminateStop,
			upbound: global.trips[dt][i].upbound,
			trainType: global.trips[dt][i].trainType,
			beginTime: global.trips[dt][i].timetable[0].depart,
			beginTime_ss: global.trips[dt][i].timetable[0].depart_ss,
			terminateTime: global.trips[dt][i].timetable[global.trips[dt][i].timetable.length - 1].arrive,
			travelTime_ss: global.trips[dt][i].timetable[global.trips[dt][i].timetable.length - 1].arrive_ss - global.trips[dt][i].timetable[0].depart_ss,
			distance: global.trips[dt][i].distance,
			distance_mugikyu: global.trips[dt][i].distance_mugikyu,
		});
	}
	//Sorting
	for (var run in runs){
		runs[run].sort(function(a, b){
			if (a.beginTime_ss < b.beginTime_ss) return -1;
			if (a.beginTime_ss > b.beginTime_ss) return 1;
			return 0;
		});
	}
	list.sort();
	//Return list
	return {list: list, runs: runs};
};

/**
 * Functions
 */

var separateAlphaNumerics = function(runNo){
	return {
		alphabet: function(str){
			var s = "";
			while (str.length && isNaN(str.slice(0, 1))){
				s = s + str.slice(0, 1);
				str = str.substring(1);
			}
			return s;
		}(runNo),
		number: function(str){
			var n = "";
			while (str.length && !isNaN(str.slice(-1))){
				n = str.slice(-1) + n;
				str = str.substring(0, str.length - 1);
			}
			return n;
		}(runNo),
	};
}

var getRunNoPairFromTripNo = function(tripNo){
	var runNo = tripNo.substring(2); //Omit hours and convert to array
	var AN = separateAlphaNumerics(runNo);
	if (!AN.number.length) return null;
	var digits = AN.number.length;
	var number = AN.number - 0;
	var alphabet = AN.alphabet;
	if (number % 2) var number2 = number + 1;
	else var number2 = number - 1;
	var number2str = number2 + "";
	while (number2str.length > digits) number2str = number2str.substring(1);
	while (number2str.length < digits) number2str = "0" + number2str;
	if (number % 2) return runNo + "/" + alphabet + number2str;
	else return alphabet + number2str + "/" + runNo;
};

exports.getRunNoPairFromTripNo = getRunNoPairFromTripNo;

var isAdjacentRunNoPairs = function(runNoPair1, runNoPair2){
	var AN1 = separateAlphaNumerics(runNoPair1);
	var AN2 = separateAlphaNumerics(runNoPair2);
	if (AN1.alphabet != AN2.alphabet) return false;
	if (Math.abs(AN1.number - AN2.number) != 2) return false;
	return true;
}

exports.isAdjacentRunNoPairs = isAdjacentRunNoPairs;