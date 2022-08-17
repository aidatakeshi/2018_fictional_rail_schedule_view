//Language Selector

$("#language_select").change(function(){
	var lang = $("#language_select").val();
	Cookies.set('lang', lang);
	location.reload();
});

if (Cookies.get('lang') != undefined){
	$("#language_select").val(Cookies.get('lang'));
}else{
	$("#language_select").val("j");
	Cookies.set('lang', "j");
}