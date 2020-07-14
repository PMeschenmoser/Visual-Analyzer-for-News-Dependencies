/**
 * Author: P. Meschenmoser
 *
 * This class manages components and events for the heuristic settings dialog. Called in main.js
 *
 */
var Heuristicsdia = function(container){
    var public = this;


    function _constructor(){
        //Here we define jQueryUI slider components and add event handlers. At each interaction, _onUI is called.
        $(container).data('public', public);
        $('.accordion-inner input').on('click', _onUI);
        $('#mfslider').slider({range:true, min: 4, max:10, step:1, values: [4,10], slide: function( event, ui ) {
                var val = (ui.values[0] === ui.values[1]) ? ui.values[0] : ui.values[0] + '-' + ui.values[1];
                $("#mfvalue").html(val);
                _onUI();
            }});
        $('#fdslider').slider({range:true, min: 0, max:10, step:1, values: [0,10], slide: function( event, ui ) {
                var val = (ui.values[0] === ui.values[1]) ? ui.values[0] : ui.values[0] + '-' + ui.values[1];
                $("#fdvalue").html(val);
                _onUI();
        }});
        $('#orslider').slider({range:true, min: 0, max:1, step:0.01, values: [0,1], slide: function( event, ui ) {
                var val = (ui.values[0] === ui.values[1]) ? ui.values[0] : ui.values[0] + '-' + ui.values[1];
                $("#orvalue").html(val);
                _onUI();
        }});
    }

    function _onUI(){
        //submit filter settings to segment layer and induce a visual update
        var seglayer = $('#segdummy').data('public');
        seglayer.setFilterSettings(_getValues());
        seglayer.visUpdate();
    }

    function _getValues(){
        var o = { mf: [],fd:[], or: [], pos:[]};

        //for pos filter:
        $('.accordion-inner input:checked').each(function(){
            o.pos.push($(this).attr('pos'));
        });
        //matching features
        var tmp1 = $("#mfvalue").html().split('-');
        o.mf.push(parseInt(tmp1[0]));
        o.mf.push(tmp1.length > 1 ? parseInt(tmp1[1]): parseInt(tmp1[0]));

        //between features
        var tmp1 = $("#fdvalue").html().split('-');
        o.fd.push(parseInt(tmp1[0]));
        o.fd.push(tmp1.length > 1 ? parseInt(tmp1[1]): parseInt(tmp1[0]));

        //order ratio
        var tmp1 = $("#orvalue").html().split('-');
        o.or.push(parseFloat(tmp1[0]));
        o.or.push(tmp1.length > 1 ? parseFloat(tmp1[1]): parseFloat(tmp1[0]));

        return o;
    }

    _constructor();
};