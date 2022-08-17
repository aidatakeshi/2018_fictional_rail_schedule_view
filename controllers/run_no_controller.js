var RunNoSearch = require("../RunNoSearch.js");

/**
 * /api/run-no/list/
 */

exports.api_run_no_list_1 = function(req, res, next){
	if (!global.dataAvailable){
		res.send({error: true});
	}
	else{
		res.send({
			WK: global.runNos.WK.list,
			PH: global.runNos.PH.list,
		});
	}
};

/**
 * /api/run-no/list/:dayType/
 */

exports.api_run_no_list_2 = function(req, res, next){
	if (!global.dataAvailable){
		res.send({error: true});
	}
	else if (req.params.dayType != "WK" && req.params.dayType != "PH") res.send({error: true});
	else{
		res.send(global.runNos[req.params.dayType].list);
	}
};

/**
 * /api/run-no/run/:dayType/:runNo1/:runNo2/
 */

exports.api_run_no_pair = function(req, res, next){
	var data = api_run_no_pair(req, res, next);
	if (data != null) res.send(obj);
	else res.send({error: true});
};

var api_run_no_pair = function(req, res, next){
	var runNoPair = req.params.runNo1 + "/" + req.params.runNo2;
	if (!global.dataAvailable) return null;
	else if (req.params.dayType != "WK" && req.params.dayType != "PH") return null;
	else if (global.runNos[req.params.dayType].runs[runNoPair] == null) return null;
	else{
		var arr = [];
		var myRuns = global.runNos[req.params.dayType].runs[runNoPair];
		for (var i in myRuns){
			arr.push(myRuns[i]);
			if (req.query["station-code-icon"] != null){
				arr[i].beginStop_stationCodeIcon = global.stations[arr[i].beginStop].stationCodeIcon;
				arr[i].terminateStop_stationCodeIcon = global.stations[arr[i].terminateStop].stationCodeIcon;
			}
			if (req.query["station-name"] != null){
				arr[i].beginStop_name = global.stations[arr[i].beginStop].name;
				arr[i].beginStop_code = global.stations[arr[i].beginStop].code;
				arr[i].beginStop_code1 = global.stations[arr[i].beginStop].code1;
				arr[i].beginStop_code2 = global.stations[arr[i].beginStop].code2;
				arr[i].terminateStop_name = global.stations[arr[i].terminateStop].name;
				arr[i].terminateStop_code = global.stations[arr[i].terminateStop].code;
				arr[i].terminateStop_code1 = global.stations[arr[i].terminateStop].code1;
				arr[i].terminateStop_code2 = global.stations[arr[i].terminateStop].code2;
			}
			if (req.query["train-type-info"] != null){
				arr[i].trainType_name = global.trainTypes[arr[i].trainType].name;
				arr[i].trainType_name_short = global.trainTypes[arr[i].trainType].name_short;
				arr[i].trainType_color = global.trainTypes[arr[i].trainType].color;
			}
		}
		return arr;
	}
}

/**
 * /run-no/:dayType/
 */

exports.run_no_list = function(req, res, next){
	if (!global.dataAvailable){
		res.send("Error");
	}
	else if (req.params.dayType != "WK" && req.params.dayType != "PH") res.send("Error");
	else{
		var list = global.runNos[req.params.dayType].list;
		var $runs = [];
		for (var i in list){
			var runs = global.runNos[req.params.dayType].runs[list[i]];
			$runs.push({
				runNo1: list[i].split("/")[0],
				runNo2: list[i].split("/")[1],
				beginStop_name: global.stations[runs[0].beginStop].name,
				beginTime: runs[0].beginTime,
				terminateStop_name:  global.stations[runs[runs.length-1].terminateStop].name,
				terminateTime: runs[runs.length-1].terminateTime,
			});
		}
		var data = {
			runNoGroups: function(list){
				var separator = [];
				for (var i = 0; i < list.length - 1; i++){
					if (!RunNoSearch.isAdjacentRunNoPairs(list[i], list[i+1])){
						separator.push(i);
					}
				}
				separator.push(list.length - 1);
				var arr = [];
				var n = 0;
				for (var i in separator){
					arr.push({from: n, to: separator[i]});
					n = separator[i] + 1;
				}
				return arr;
			}(list),
			runs: $runs,
			req: req,
			sch_change: global.timetablePDF.sch_updated,
		};
		res.render("run_no_list", data);
	}
};

/**
 * /run-no/:dayType/:runNo1/:runNo2/
 */

exports.run_no_detail = function(req, res, next){
	req.query["station-code-icon"] = true;
	req.query["station-name"] = true;
	req.query["train-type-info"] = true;
	var data = api_run_no_pair(req, res, next);
	if (data != null){
		res.render("run_no_details", {
			data: data,
			req: req,
			sch_change: global.timetablePDF.sch_updated,
		});
	}else{
		res.send("Error");
	}
};

/**
 * /run-no/:dayType/:runNo
 */

exports.run_no_redirect = function(req, res, next){
	var dayType = req.params.dayType;
	var runNo = req.params.runNo;
	var runNoPair = RunNoSearch.getRunNoPairFromTripNo("##" + runNo);
	if (runNoPair == null){
		res.send("Error");
	}else{
		res.redirect("/run-no/" + dayType + "/" + runNoPair);
	}
};