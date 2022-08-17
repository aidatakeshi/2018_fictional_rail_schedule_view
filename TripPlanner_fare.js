/**
 * getStationDistance(station1, station2) = 0.0,
 * getOriginalFareByDistance(distance, basis) = 000;
 * getPremiumFeeByDistance(distance, type) = 000;
 * getPremiumFee(station1, station2, type) = 000;
 * exports.getBasicFare(station1, station2) = 000,
 * exports.getLinerFee(station1, station2) = 000;
 * exports.getReservedFee(station1, station2) = 000;
 */

//getStationDistance

var getStationDistance = function(station1, station2){
	var list = getStationDistanceList(station1);
	return list[station2];
};

var getStationDistanceList = function(station1){
	//Prepare List
	var distances = {};
	for (var station in global.stations){
		distances[station] = Infinity;
	}
	distances[station1] = 0;
	//Propagate
	var propagate = function(baseDistance, baseStation, excludeLine){
		//Find Lines
		for (var line in global.lines){
			if (line != excludeLine && global.lines[line].stationIndex[baseStation] != null){
				var myIndex = global.lines[line].stationIndex[baseStation];
				var myMileage = global.lines[line].stations[myIndex].mileage;
				//Find other stations on the line
				for (var i in global.lines[line].stations){
					if (i != myIndex){
						var anotherStation = global.lines[line].stations[i].id;
						var myFareMultiplier = (global.fares.fareMultiplier[line] == null) ? 1 : global.fares.fareMultiplier[line];
						var totalDistance = baseDistance + Math.abs(myMileage - global.lines[line].stations[i].mileage) * myFareMultiplier;
						totalDistance = Math.round(totalDistance * 10) / 10;
						if (distances[anotherStation] >= totalDistance){
							//Adopt new distance
							distances[anotherStation] = totalDistance;
							//Propagate
							propagate(totalDistance, anotherStation, line);
						}
					}
				}
			}
		}
	};
	propagate(0, station1, null);
	//Return List
	return distances;
}

//getOriginalFareByDistance, exports.getBasicFare

var getOriginalFareByDistance = function(distance, basis){
	if (distance == 0) return {IC: {normal: 0, discount: 0}, ticket: {normal: 0, discount: 0}};
	var myFareBasis = global.fares.fareBasis[basis];
	var myFare = 0;
	var flag = true;
	for (var i = 0 ; i < myFareBasis.length && flag; i++){
		if (myFareBasis[i].minMileage < distance) myFare = myFareBasis[i].fare;
		else flag = false;
	}
	return myFare;
}

exports.getBasicFare = function(station1, station2){
	if (global.stations[station1] == null) return null;
	if (global.stations[station2] == null) return null;
	var fareType1 = global.fares.stationSpecialFare[station1];
	var fareType2 = global.fares.stationSpecialFare[station2];
	var specialFare = global.fares.specialFares[fareType1][fareType2];
	if (specialFare.fareTypes == null) specialFare.fareTypes = [{fareType: "default"}];
	var myFare = {IC: {normal: 0, discount: 0}, ticket: {normal: 0, discount: 0}};
	for (var i in specialFare.fareTypes){
		var fareBasis = specialFare.fareTypes[i].fareType;
		var from = (specialFare.fareTypes[i].after == null) ? station1 : specialFare.fareTypes[i].after;
		var to = (specialFare.fareTypes[i].before == null) ? station2 : specialFare.fareTypes[i].before;
		var distance = getStationDistance(from, to);
		var subFare = getOriginalFareByDistance(distance, fareBasis);
		myFare.IC.normal += subFare.IC.normal;
		myFare.IC.discount += subFare.IC.discount;
		myFare.ticket.normal += subFare.ticket.normal;
		myFare.ticket.discount += subFare.ticket.discount;
	}
	if (specialFare.normal != null){
		myFare.IC.normal += specialFare.normal;
		myFare.ticket.normal += specialFare.normal;
	}
	if (specialFare.discount != null){
		myFare.IC.discount += specialFare.discount;
		myFare.ticket.discount += specialFare.discount;
	}
	return myFare;
};

//getPremiumFeeByDistance, getPremiumFee, getLinerFee, getReservedFee

var getPremiumFeeByDistance = function(distance, type){
	if (distance == 0) return {normal: 0, discount: 0};
	var myFeeBasis = global.fares.premiumFee[type];
	var myFee = 0;
	var flag = true;
	for (var i = 0 ; i < myFeeBasis.length && flag; i++){
		if (myFeeBasis[i].minMileage < distance) myFee = myFeeBasis[i].fee;
		else flag = false;
	}
	return myFee;
}

var getPremiumFee = function(station1, station2, type, distance){
	if (global.fares.premiumFee[type] == null) return null;
	if (global.stations[station1] == null) return null;
	if (global.stations[station2] == null) return null;
	var fareType1 = global.fares.stationSpecialFare[station1];
	var fareType2 = global.fares.stationSpecialFare[station2];
	var surcharges = global.fares.premiumFeeSurcharges[type];
	if (surcharges[fareType1] == null) fareType1 = "others";
	if (surcharges[fareType1][fareType2] == null) fareType2 = "others";
	var surcharge = surcharges[fareType1][fareType2];
	if (distance == null) distance = getStationDistance(station1, station2);
	var premiumFee = getPremiumFeeByDistance(distance, type);
	return {
		normal: premiumFee.normal + surcharge.normal,
		discount: premiumFee.discount + surcharge.discount,
	};
}

exports.getLinerFee = function(station1, station2, distance){
	return getPremiumFee(station1, station2, "liner", distance);
}

exports.getReservedFee = function(station1, station2, distance){
	return getPremiumFee(station1, station2, "reserved", distance);
}