const PDFDocument = require('pdfkit');
const blobStream  = require('blob-stream');
const s = require('./pdf-settings.js');
const fs = require('fs');
const SVGtoPDF = require('svg-to-pdfkit');

PDFDocument.prototype.addSVG = function(name, x, y, options) {
    if (s.svgs[name] != null){
        return SVGtoPDF(this, s.svgs[name], x, y, options);
    }else{
        console.log(name + " svg not found");
    }
};

/**
 * Main Function
 */

exports.createPDFTimetable = function(res, data){
    //Setup Page
    const doc = new PDFDocument(s.pageSetup);
    //var fileName = "pdf/cache/Timetable-" + data.params.station + "-" + data.params.line + "-" + data.params.direction + ".pdf";
    var stream = doc.pipe(res);
    //Fonts
    s.registerFonts(doc);

    //Categorized Timetable
    var ct = getCategorizedTimetable(data);
    //Get Page Layout
    var pages = getPageLayout(ct);

    //Start Drawing
    for (var i in pages){
        //New page
        if (i > 0) doc.addPage();
        //For each page...
        //Declare remarks object
        var remarks = getEmptyRemarksObject();
        //Header
        drawHeader(doc, data);
        //Timetable
        drawTimetable(doc, remarks, pages[i], ct, data.params);
        //Schedule Change
        drawScheduleChangeText(doc);
        //Remarks
        drawRemarks(doc, remarks);
    }
    
    //Finalize PDF
    doc.end();
};

/**
 * Header
 */

var drawHeader = function(doc, data){
    //Background
    doc.rect(s.header.x, s.header.y, s.header.width, s.header.height).fill(s.header.bg);
    //Text
    var $$ = s.header.jp.text.replace("{1}", data.station.name.j);
    doc.fillColor(s.header.jp.color).font(s.header.jp.font).fontSize(s.header.jp.size)
        .text($$, 0, s.header.jp.y, {align: 'center', width: s.header.width});
    var $$ = s.header.en.text.replace("{1}", data.station.name.e);
    doc.fillColor(s.header.en.color).font(s.header.en.font).fontSize(s.header.en.size)
        .text($$, 0, s.header.en.y, {align: 'center', width: s.header.width});
    //Background
    doc.rect(s.subheader.x, s.subheader.y, s.subheader.width, s.subheader.height).fill(getSubheaderBGColor(data));
    //Text
    var $$ = s.subheader.jp.text.replace("{1}", data.line.name.j).replace("{2}", data.line.this_direction_name.j);
    doc.fillColor(s.subheader.jp.color).font(s.subheader.jp.font).fontSize(s.subheader.jp.size)
        .text($$, 0, s.subheader.jp.y, {align: 'center', width: s.subheader.width});
    var $$ = s.subheader.en.text.replace("{1}", data.line.name.e).replace("{2}", data.line.this_direction_name.e);
    doc.fillColor(s.subheader.en.color).font(s.subheader.en.font).fontSize(s.subheader.en.size)
        .text($$, 0, s.subheader.en.y, {align: 'center', width: s.subheader.width});
};

var getSubheaderBGColor = function(data){
    if (global.timetablePDF.line_color_overwrite[data.line.id] != null){
        return global.timetablePDF.line_color_overwrite[data.line.id];
    }
    return data.line.color.bg;
};

var drawScheduleChangeText = function(doc){
    doc.fillColor(s.sch_change.jp.color).font(s.sch_change.jp.font).fontSize(s.sch_change.jp.size)
    .text(global.timetablePDF.sch_updated.j, 0, s.sch_change.jp.y, {align: 'right', width: s.sch_change.jp.x});
    doc.fillColor(s.sch_change.en.color).font(s.sch_change.en.font).fontSize(s.sch_change.en.size)
    .text(global.timetablePDF.sch_updated.e, 0, s.sch_change.en.y, {align: 'right', width: s.sch_change.en.x});
};

/**
 * Categorized Timetable
 */

//[WK0, WK1, WK2, PH0, PH1, PH2][hours]
var getCategorizedTimetable = function(data){
    //Get categories
    var params = data.params.station+"-"+data.params.line+"-"+data.params.direction;
    if (global.timetablePDF.categories[params] != null){
        var categories = global.timetablePDF.categories[params];
    }else{
        var categories = [{name: "", name_eng: ""}]; //Not categorized -> one empty-name category
    }
    //Set up object
    var ct = {count: categories.length};
    var TPH_by_category = [];
    //Find for each category
    for (var i in categories){
        ct["WK"+i] = getCategorizedTimetable_item("WK", categories[i], data);
        ct["PH"+i] = getCategorizedTimetable_item("PH", categories[i], data);
    }
    //Return object
    return ct;
};

var getCategorizedTimetable_item = function(dayType, category, data){
    //Set up object
    var obj = {
        name: category.name,
        name_eng: category.name_eng,
        timetable: [
            [],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[], //24 hours
        ],
        TPH: -1,
        hour1: Infinity, hour2: 0,
    };
    //Set up types filter
    var types = category.types;
    var types_except = category.types_except;
    //Search in timetable
    for (var i in data.timetable[dayType]){
        var myItem = data.timetable[dayType][i];
        var myType = myItem.trainType;
        var flag = true;
        if (types != null){
            if (types.indexOf(myType) == -1) flag = false;
        }else if (types_except != null){
            if (types_except.indexOf(myType) > -1) flag = false;
        }
        //If valid, push
        if (flag){
            var hours = Math.floor(myItem.depart_ss / 3600);
            if (hours < obj.hour1) obj.hour1 = hours;
            if (hours > obj.hour2) obj.hour2 = hours;
            obj.timetable[hours % 24].push(myItem);
        }
    }
    //Summarize TPH
    for (var hour in obj.timetable){
        var count = 0;
        for (var i in obj.timetable[hour]){
            count++;
            //Deduct coupled trains
            if (i > 0){
                if (obj.timetable[hour][i].trainType == obj.timetable[hour][i-1].trainType)
                if (obj.timetable[hour][i].depart_ss == obj.timetable[hour][i-1].depart_ss) count--;
            }
        }
        if (count > obj.TPH) obj.TPH = count;
    }
    //Return object
    return obj;
};

/**
 * Layout
 */

var getPageLayout = function(ct){
    var pages = [];
    //Get hour1, hour2
    var hour1 = Infinity; var hour2 = 0;
    for (var i = 0; i < ct.count; i++){
        if (ct["WK"+i].hour1 < hour1) hour1 = ct["WK"+i].hour1;
        if (ct["PH"+i].hour1 < hour1) hour1 = ct["PH"+i].hour1;
        if (ct["WK"+i].hour2 > hour2) hour2 = ct["WK"+i].hour2;
        if (ct["PH"+i].hour2 > hour2) hour2 = ct["PH"+i].hour2;
    }
    //Function to check if compactable
    var isCompactable = function(TPH1, TPH2){
        if (TPH2 == null) return false;
        if (TPH1 + TPH2 > s.timetable.compact.TPH_max_total) return false;
        if (TPH1 > s.timetable.compact.TPH_max_1) return false;
        if (TPH2 > s.timetable.compact.TPH_max_2) return false;
        return true;
    }
    //For having only 1 category, try compacting WK0 and PH0
    if (ct.count == 1){
        //Compactable
        if (isCompactable(ct["WK0"].TPH, ct["PH0"].TPH)){
            pages.push({id: "WK0", id2: "PH0", dayType: "WK", dayType2: "PH"});
        }
        //Not compactable
        else{
            pages.push({id: "WK0", dayType: "WK"}, {id: "PH0", dayType: "PH"});
        }
    }
    //For having multiple categories, consider each pair
    else{
        var pages_WK = [];
        var pages_PH = [];
        for (var i = 0; i < ct.count; i++){
            //Compactable
            var TPH1 = Math.max(ct["WK"+i].TPH, ct["PH"+i].TPH);
            var TPH2 = (i < ct.count - 1) ? Math.max(ct["WK"+(i+1)].TPH, ct["PH"+(i+1)].TPH) : null;
            if (isCompactable(TPH1, TPH2)){
                pages_WK.push({id: "WK"+i, id2: "WK"+(i+1), dayType: "WK", dayType2: "WK"});
                pages_PH.push({id: "PH"+i, id2: "PH"+(i+1), dayType: "PH", dayType2: "PH"});
                i++;
            }
            //Not compactable
            else{
                pages_WK.push({id: "WK"+i, dayType: "WK"});
                pages_PH.push({id: "PH"+i, dayType: "PH"});
            }
        }
        pages = pages_WK.concat(pages_PH);
    }
    //Calculate x, x2, width, width2, itemWidth for each page
    for (var i in pages){
        pages[i].hour1 = hour1;
        pages[i].hour2 = hour2;
        //Single item page
        if (pages[i].id2 == null){
            var innerWidth = s.timetable.width - s.timetable.inner_box.margin_left - s.timetable.inner_box.margin_right;
            var TPH = ct[pages[i].id].TPH;
            pages[i].x = s.timetable.inner_box.margin_left;
            pages[i].width = innerWidth;
            pages[i].itemWidth = Math.min(Math.max(s.timetableItem.width, innerWidth / TPH), s.timetableItem.max_spacing);
        }
        //Double item page
        else{
            var innerWidth = s.timetable.width - s.timetable.inner_box.margin_left * 2 - s.timetable.inner_box.margin_right * 2;
            var TPH1 = ct[pages[i].id].TPH;
            var TPH2 = ct[pages[i].id2].TPH;
            var $ = s.timetable.compact;
            var a = innerWidth / $.TPH_max_total * ($.TPH_max_total - $.TPH_max_2);
            var b = (TPH1 > TPH2)
                ? Math.min(Math.max(TPH1 * s.timetableItem.max_spacing, innerWidth / 2), innerWidth / (TPH1 + TPH2) * TPH1)
                : Math.max(Math.min(TPH1 * s.timetableItem.max_spacing, innerWidth / 2), innerWidth / (TPH1 + TPH2) * TPH1);
            var c = innerWidth / $.TPH_max_total * $.TPH_max_1;
            pages[i].x = s.timetable.inner_box.margin_left;
            pages[i].width = Math.min(Math.max(a, b), c);
            pages[i].x2 = s.timetable.inner_box.margin_left * 2 + s.timetable.inner_box.margin_right + pages[i].width;
            pages[i].width2 = innerWidth - pages[i].width;
            var itemWidth1 = Math.min(Math.max(s.timetableItem.width, pages[i].width / TPH1), s.timetableItem.max_spacing);
            var itemWidth2 = Math.min(Math.max(s.timetableItem.width, pages[i].width2 / TPH2), s.timetableItem.max_spacing);
            pages[i].itemWidth = Math.min(itemWidth1, itemWidth2);

        }
    }
    //Return object
    return pages;
};

/**
 * Timetable
 */

var drawTimetable = function(doc, remarks, page, ct, params){
    var $dt1 = page.dayType;
    var $dt2 = page.dayType2;
    //Background
    var $ML = s.timetable.inner_box.margin_left;
    var $MX = s.timetable.inner_box.margin_right + $ML;
    doc.rect(page.x - $ML, s.timetable.outer_box.y, page.width + $MX, s.timetable.outer_box.height).fill(s.timetable.title[$dt1].bg);
    doc.rect(page.x, s.timetable.inner_box.y, page.width, s.timetable.inner_box.height).fill(s.timetable.inner_box.bg);
    if (page.id2 != null){
        var $bg = (page.dayType != page.dayType2) ? s.timetable.title[$dt2].bg : s.timetable.title[$dt2].bg2;
        doc.rect(page.x2 - $ML, s.timetable.outer_box.y, page.width2 + $MX, s.timetable.outer_box.height).fill($bg);
        doc.rect(page.x2, s.timetable.inner_box.y, page.width2, s.timetable.inner_box.height).fill(s.timetable.inner_box.bg);
    }
    //Timetable Title
    var $w = s.header.width;
    doc.fillColor(s.timetable.title[$dt1].color).font(s.timetable.title[$dt1].jp.font).fontSize(s.timetable.title[$dt1].jp.size)
    .text(s.timetable.title[$dt1].jp.text, page.x, s.timetable.title[$dt1].y, {align: 'left', width: $w});
    doc.fillColor(s.timetable.title[$dt1].color).font(s.timetable.title[$dt1].en.font).fontSize(s.timetable.title[$dt1].en.size)
    .text(s.timetable.title[$dt1].en.text, page.x + s.timetable.title[$dt1].x_shift, s.timetable.title[$dt1].y + s.timetable.title[$dt1].y_shift, {align: 'left', width: $w});
    if (page.id2 != null && page.dayType != page.dayType2){
        doc.fillColor(s.timetable.title[$dt2].color).font(s.timetable.title[$dt2].jp.font).fontSize(s.timetable.title[$dt2].jp.size)
        .text(s.timetable.title[$dt2].jp.text, page.x2, s.timetable.title[$dt2].y, {align: 'left', width: $w});
        doc.fillColor(s.timetable.title[$dt2].color).font(s.timetable.title[$dt2].en.font).fontSize(s.timetable.title[$dt2].en.size)
        .text(s.timetable.title[$dt2].en.text, page.x2 + s.timetable.title[$dt2].x_shift, s.timetable.title[$dt2].y + s.timetable.title[$dt2].y_shift, {align: 'left', width: $w});
    }
    //Timetable Subtitle
    var $w = s.header.width;
    if (ct[page.id].name != ""){
        doc.fillColor(s.timetable.subtitle.color).font(s.timetable.subtitle.jp.font).fontSize(s.timetable.subtitle.jp.size)
        .text(ct[page.id].name, page.x + page.width - $w, s.timetable.subtitle.jp.y, {align: 'right', width: $w});
        doc.fillColor(s.timetable.subtitle.color).font(s.timetable.subtitle.en.font).fontSize(s.timetable.subtitle.en.size)
        .text(ct[page.id].name_eng, page.x + page.width - $w, s.timetable.subtitle.en.y, {align: 'right', width: $w});
    }
    if (page.id2 != null){
        doc.fillColor(s.timetable.subtitle.color).font(s.timetable.subtitle.jp.font).fontSize(s.timetable.subtitle.jp.size)
        .text(ct[page.id2].name, page.x2 + page.width2 - $w, s.timetable.subtitle.jp.y, {align: 'right', width: $w});
        doc.fillColor(s.timetable.subtitle.color).font(s.timetable.subtitle.en.font).fontSize(s.timetable.subtitle.en.size)
        .text(ct[page.id2].name_eng, page.x2 + page.width2 - $w, s.timetable.subtitle.en.y, {align: 'right', width: $w});
    }
    //Odd / Even Background
    var $y = s.timetable.inner_box.y;
    for (var i = 0; i < s.timetable.outer_box.rows; i++){
        var myColor = ((i + page.hour1) % 2 == 0) ? s.timetableItem.bg_even : s.timetableItem.bg_odd;
        //Draw Background
        doc.rect(page.x, $y, page.width, s.timetableItem.height).fill(myColor);
        if (page.id2 != null) doc.rect(page.x2, $y, page.width2, s.timetableItem.height).fill(myColor);
        //Next
        $y += s.timetableItem.height;
    }
    //Timetable Row
    var $y = s.timetable.inner_box.y;
    for (var i = page.hour1; i <= page.hour2; i++){
        var hour = i % 24;
        //Hour Number
        doc.fillColor(s.timetableItem.title.color).font(s.timetableItem.title.font).fontSize(s.timetableItem.title.size)
        .text(i % 24, page.x - $ML + s.timetableItem.title.x_shift, $y + s.timetableItem.title.y_shift, {align: 'center', width: $ML});
        if (page.id2 != null){
            doc.fillColor(s.timetableItem.title.color).font(s.timetableItem.title.font).fontSize(s.timetableItem.title.size)
            .text(i % 24, page.x2 - $ML + s.timetableItem.title.x_shift, $y + s.timetableItem.title.y_shift, {align: 'center', width: $ML});
        }
        //Content
        var $x = page.x + (page.itemWidth - s.timetableItem.width) / 2;
        var $hour = ct[page.id].timetable[hour];
        for (var j = 0; j < $hour.length; j++){
            var skipNext = drawTimetable_entry(doc, remarks, $x, $y, $hour[j], $hour[j+1], params);
            if (skipNext) j++;
            //Next
            $x += page.itemWidth;
        };
        //Content 2
        if (page.id2 != null){
            var $x = page.x2 + (page.itemWidth - s.timetableItem.width) / 2;
            var $hour = ct[page.id2].timetable[hour];
            for (var j = 0; j < $hour.length; j++){
                var skipNext = drawTimetable_entry(doc, remarks, $x, $y, $hour[j], $hour[j+1], params);
                if (skipNext) j++;
                //Next
                $x += page.itemWidth;
            };
        }
        //Next
        $y += s.timetableItem.height;
    }
};

/**
 * For each timetable entry
 */

var drawTimetable_entry = function(doc, remarks, $x, $y, item, itemNext, params){
    //Check if combine with next item
    var combine = false;
    if (itemNext != null){
        if (item.trainType == itemNext.trainType && item.depart_ss == itemNext.depart_ss) combine = true;
    }
    if (combine){
        //Combine
        var noOfCars = item.consist.noOfCars + itemNext.consist.noOfCars;
        if (item.terminateStop < itemNext.terminateStop){
            var dest = item.terminateStop_name.j.substr(0,1) + "・" + itemNext.terminateStop_name.j.substr(0,1);
            var dest_eng = item.terminateStop_name.e.substr(0,1) + "&" + itemNext.terminateStop_name.e.substr(0,1);
            var dest2 = item.terminateStop_name.j + "・" + itemNext.terminateStop_name.j
            var dest2_eng = item.terminateStop_name.e + " & " + itemNext.terminateStop_name.e;
        }else if (item.terminateStop > itemNext.terminateStop){
            var dest = itemNext.terminateStop_name.j.substr(0,1) + "・" + item.terminateStop_name.j.substr(0,1);
            var dest_eng = itemNext.terminateStop_name.e.substr(0,1) + "&" + item.terminateStop_name.e.substr(0,1);
            var dest2 = itemNext.terminateStop_name.j + "・" + item.terminateStop_name.j
            var dest2_eng = itemNext.terminateStop_name.e + " & " + item.terminateStop_name.e;
        }else{
            var dest = item.terminateStop_name_short.j;
            var dest_eng = item.terminateStop_name_short.e;
        }
    }else{
        var noOfCars = item.consist.noOfCars;
        var dest = item.terminateStop_name_short.j;
        var dest_eng = item.terminateStop_name_short.e;
        var dest2 = item.terminateStop_name.j;
        var dest2_eng = item.terminateStop_name.e;
    }
    //Prepare Variables
    var minutes = item.depart.split(":")[1];
    var track = item.track;
    var trainType = item.trainType;
    var color_bg = item.trainType_color.bg;
    var color_box = s.timetable.inner_box.bg;
    var color_text = item.trainType_color.text;
    var trainType_jp = item.trainType_name.j;
    var trainType_en = item.trainType_name.e;
    var trainType_priority = item.trainType_priority;
    var isBeginning = (item.beginStop == params.station);
    var isLiner = (item.consist.others.liner);
    var hasReserved = (item.consist.others.reserved) || isLiner;
    var specialTextColor = false;
    //Overwrite
    if (global.timetablePDF.train_types_overwrite[trainType] != null){
        var $ = global.timetablePDF.train_types_overwrite[trainType];
        color_bg = chooseOne(color_bg, $.color.bg);
        color_text = chooseOne(color_text, $.color.text);
        color_box = chooseOne(color_box, $.color.box);
        trainType_jp = chooseOne(trainType_jp, $.name);
        trainType_en = chooseOne(trainType_en, $.name_eng);
        specialTextColor = chooseOne(specialTextColor, $.color.specialTextColor);
    }
    //Draw Box
    if (hasReserved){
        //Type 1
        var _x = $x + s.timetableItem.type1.x_shift;
        var _y = $y + s.timetableItem.type1.y_shift;
        var _w = s.timetableItem.type1.width;
        var _h = s.timetableItem.type1.height;
        doc.rect(_x, _y, _w, _h).fill(color_bg);
        var minutes_color = color_text;
    }else{
        //Type 2
        var _x = $x + s.timetableItem.type2.x_shift;
        var _y = $y + s.timetableItem.type2.y_shift;
        var _w = s.timetableItem.type2.width;
        var _h = s.timetableItem.type2.height;
        var _x2 = $x + s.timetableItem.type2.box_x_shift;
        var _y2 = $y + s.timetableItem.type2.box_y_shift;
        var _w2 = s.timetableItem.type2.box_width;
        var _h2 = s.timetableItem.type2.box_height;
        doc.rect(_x, _y, _w, _h).fill(color_bg);
        doc.rect(_x2, _y2, _w2, _h2).fill(color_box);
        var minutes_color = specialTextColor ? color_text : color_bg;
    }
    //Minutes Text
    var _y = $y + s.timetableItem.minutes.y_shift;
    doc.fillColor(minutes_color).font(s.timetableItem.minutes.font).fontSize(s.timetableItem.minutes.size)
        .text(minutes, _x, _y, {align: 'center', width: _w});
    //Destinations
    var _y = $y + s.timetableItem.dest_j.y_shift;
    doc.fillColor(s.timetableItem.dest_j.color).font(s.timetableItem.dest_j.font).fontSize(s.timetableItem.dest_j.size)
        .text(dest, _x, _y, {align: 'center', width: _w});
    var _y = $y + s.timetableItem.dest_e.y_shift;
    var _m = s.timetableItem.dest_e.margin;
    doc.fillColor(s.timetableItem.dest_e.color).font(s.timetableItem.dest_e.font).fontSize(s.timetableItem.dest_e.size)
        .text(dest_eng, _x+_m, _y, {align: 'right', width: _w-_m*2});
    //Track
    var _x = $x + s.timetableItem.track.x_shift;
    var _y = $y + s.timetableItem.track.y_shift;
    doc.addSVG("track-" + track, _x, _y, {width: s.timetableItem.track.size, height: s.timetableItem.track.size});
    //No of Cars
    var _x = $x + s.timetableItem.noOfCars.x_shift;
    var _y = $y + s.timetableItem.noOfCars.y_shift;
    doc.addSVG("cars-" + noOfCars, _x, _y, {width: s.timetableItem.noOfCars.size, height: s.timetableItem.noOfCars.size});
    //Beginning
    if (isBeginning){
        var _x = $x + s.timetableItem.beginning.x_shift;
        var _y = $y + s.timetableItem.beginning.y_shift;
        doc.addSVG("beginning", _x, _y, {width: s.timetableItem.beginning.size, height: s.timetableItem.beginning.size});
    }
    //Reserved / Liner
    if (hasReserved){
        var _x = $x + s.timetableItem.reserved.x_shift;
        var _y = $y + s.timetableItem.reserved.y_shift;
        doc.addSVG(isLiner ? "liner" : "reserved", _x, _y, {width: s.timetableItem.reserved.size, height: s.timetableItem.reserved.size});
    }
    //Add to remarks
    remarks.dests[dest_eng] = { name: dest2, name_eng: dest2_eng};
    remarks.trainTypes[trainType + (hasReserved ? "#" : "")] = {priority: trainType_priority, name: trainType_jp, name_eng: trainType_en, hasReserved, isLiner, color_bg, box_bg: color_box, color_text: minutes_color};
    remarks.hasReserved = remarks.hasReserved || hasReserved;
    //Return result
    return combine;
};

var chooseOne = function(a,b){
    if (b != null) return b;
    return a;
}

/**
 * Remarks
 */

var drawRemarks = function(doc, remarks){
    //Background
    doc.rect(s.remarks.bg.x, s.remarks.bg.y, s.remarks.bg.width, s.remarks.bg.height).fill(s.remarks.bg.bg);
    
    //Legend
    var $ = drawRemarksBox(doc, s.remarks.initial_x, s.remarks.legend.width, s.remarks.legend.title, s.remarks.legend.title_en);
    doc.addSVG("legend", $.x, $.y, {width: $.width, height: $.height});
    drawCaptions(doc, $, s.remarks.legend.contents);

    //Train Types
    //.. Transfer to array and sort by priority (and reserved?)
    var trainTypes = [];
    for (var i in remarks.trainTypes) trainTypes.push(remarks.trainTypes[i]);
    trainTypes.sort((a,b) => (b.priority + (b.hasReserved ? 0.5 : 0) - a.priority - (a.hasReserved ? 0.5 : 0)));
    var itemsPerRow = Math.floor(s.remarks.body.height / s.remarks.trainTypes.item_height);
    var noOfRows = Math.ceil(trainTypes.length / itemsPerRow);
    //.. Draw
    var $ = drawRemarksBox(doc, $.x_next, s.remarks.trainTypes.width * noOfRows, s.remarks.trainTypes.title, s.remarks.trainTypes.title_en);
    var $x = $.x; var $y_top = $.y; var $y = $y_top;
    var count = 0;
    for (var i = 0; i < trainTypes.length; i++){
        //If full, next row
        if (count >= itemsPerRow){
            count = 0;
            $x += s.remarks.trainTypes.width; $y = $y_top;
        }
        count++;
        //Icon Box
        if (trainTypes[i].hasReserved){
            var ss = s.remarks.trainTypes.type1;
            doc.rect($x + ss.x_shift, $y + ss.y_shift, ss.width, ss.height).fill(trainTypes[i].color_bg);
        }else{
            var ss = s.remarks.trainTypes.type2;
            doc.rect($x + ss.x_shift, $y + ss.y_shift, ss.width, ss.height).fill(trainTypes[i].color_bg);
            doc.rect($x + ss.box_x_shift, $y + ss.box_y_shift, ss.box_width, ss.box_height).fill(trainTypes[i].box_bg);
        }
        //Icon Number "00"
        var ss = s.remarks.trainTypes.minutes;
        doc.fillColor(trainTypes[i].color_text).font(ss.font).fontSize(ss.size).text("00", $x + ss.x_shift, $y + ss.y_shift, {align: "center", width: ss.width});
        //Captions
        var jp = trainTypes[i].name + (trainTypes[i].isLiner ? s.remarks.trainTypes.liner_suffix.jp : trainTypes[i].hasReserved ? s.remarks.trainTypes.reserved_suffix.jp : "");
        var en = trainTypes[i].name_eng + (trainTypes[i].isLiner ? s.remarks.trainTypes.liner_suffix.en : trainTypes[i].hasReserved ? s.remarks.trainTypes.reserved_suffix.en : "");
        var ss = s.remarks.trainTypes.jp;
        doc.fillColor(ss.color).font(ss.font).fontSize(ss.size).text(jp, $x + ss.x_shift, $y + ss.y_shift, {align: "left", width: s.remarks.trainTypes.width});
        var ss = s.remarks.trainTypes.en;
        doc.fillColor(ss.color).font(ss.font).fontSize(ss.size).text(en, $x + ss.x_shift, $y + ss.y_shift, {align: "left", width: s.remarks.trainTypes.width});
        //Increment
        $y += s.remarks.trainTypes.item_height;
    }
    
    //Destinations
    //.. Transfer to array and sort by name
    var dests = [];
    for (var code in remarks.dests){
        remarks.dests[code].code = code;
        dests.push(remarks.dests[code]);
    }
    dests.sort((a,b) => ((a.code > b.code) ? 1 : -1));
    var itemsPerRow = Math.floor(s.remarks.body.height / s.remarks.dests.item_height);
    var noOfRows = Math.ceil(dests.length / itemsPerRow);
    //.. Draw
    var $ = drawRemarksBox(doc, $.x_next, s.remarks.dests.width * noOfRows, s.remarks.dests.title, s.remarks.dests.title_en);
    var $x = $.x; var $y_top = $.y; var $y = $y_top;
    var count = 0;
    for (var i = 0; i < dests.length; i++){
        //If full, next row
        if (count >= itemsPerRow){
            count = 0;
            $x += s.remarks.dests.width; $y = $y_top;
        }
        count++;
        //Icon Box
        var ss = s.remarks.dests.box;
        doc.rect($x + ss.x_shift, $y + ss.y_shift, ss.width, ss.height).fill(ss.bg);
        //Code
        var ss = s.remarks.dests.code;
        doc.fillColor(ss.color).font(ss.font).fontSize(ss.size).text(dests[i].code, $x + ss.x_shift, $y + ss.y_shift, {align: "center", width: ss.width});
        //Captions
        var ss = s.remarks.dests.jp;
        doc.fillColor(ss.color).font(ss.font).fontSize(ss.size).text(dests[i].name, $x + ss.x_shift, $y + ss.y_shift, {align: "left", width: s.remarks.trainTypes.width});
        var ss = s.remarks.dests.en;
        doc.fillColor(ss.color).font(ss.font).fontSize(ss.size).text(dests[i].name_eng, $x + ss.x_shift, $y + ss.y_shift, {align: "left", width: s.remarks.trainTypes.width});
        //Increment
        $y += s.remarks.dests.item_height;
    }

    //Reserved Guide
    if (remarks.hasReserved){
        var $ = drawRemarksBox(doc, $.x_next, s.remarks.reservedGuide.width, s.remarks.reservedGuide.title, s.remarks.reservedGuide.title_en);
        doc.addSVG("reserved-guide", $.x, $.y, {width: $.width, height: $.height});
        drawCaptions(doc, $, s.remarks.reservedGuide.contents);
    }

    //End
};

//Empty Remarks Object

var getEmptyRemarksObject = function(){
    return {
        dests: {}, //code: [{name, name_eng}]
        trainTypes: {}, //code#: [{priority, name, name_eng, hasReserved, isLiner, color_bg, color_text}]
        hasReserved: false,
    };
}

//Function to draw box --> returns {x, y, width, height} of inner box and {x_next}
var drawRemarksBox = function(doc, $x, width, title, title_en){
    var margin = s.remarks.box.margin;
    //Outer box
    doc.rect($x, s.remarks.box.y, margin*2 + width, s.remarks.box.height).fill(s.remarks.box.bg);
    //Inner box
    if (title != null && title_en != null){
        //With title
        var $y = s.remarks.body.y;
        var $h = s.remarks.body.height;
        doc.rect($x + margin, $y, width, $h).fill(s.remarks.body.bg);
        var _y = s.remarks.box.y + s.remarks.title_jp.y_shift;
        doc.fillColor(s.remarks.title_jp.color).font(s.remarks.title_jp.font).fontSize(s.remarks.title_jp.size)
            .text(title, $x + margin, _y, {align: 'center', width: width});
        var _y = s.remarks.box.y + s.remarks.title_en.y_shift;
        doc.fillColor(s.remarks.title_en.color).font(s.remarks.title_en.font).fontSize(s.remarks.title_en.size)
            .text(title_en, $x + margin, _y, {align: 'center', width: width});
    }else{
        //No title
        var $y = s.remarks.body.y2;
        var $h = s.remarks.body.height2;
        doc.rect($x + margin, $y, width, $h).fill(s.remarks.body.bg);
    }
    //Return data
    var x_next = $x + margin *2 + width + s.remarks.x_spacing
    return {x: $x + margin, y: $y, width: width, height: $h, x_next: x_next};
};

//Function to draw captions
var drawCaptions = function(doc, $, contents){
    for (var i in contents){
        var $w = $.width;
        var $x = $.x + contents[i].x - (contents[i].align == "right" ? $w : contents[i].align == "center" ? $w / 2 : 0);
        var $y = $.y + contents[i].y;
        doc.fillColor(contents[i].color).font(contents[i].font).fontSize(contents[i].size).text(contents[i].text, $x, $y, {align: contents[i].align, width: $w});
    }
};