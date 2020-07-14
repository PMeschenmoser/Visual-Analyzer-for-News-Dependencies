/**
 * Author: P. Meschenmoser
 *
 * This class manages components and events for the visualisation settings dialog. Called in main.js
 *
 */
var Visdia = function(){
    var public = this;

    function _constructor(){
        //segment opacity factor
        $('#sofslider').slider({min: 0.1, max:2, step:0.01, value: 1, slide: function( event, ui ) {
            //directly change polygon fill opacities
            $('#sofvalue').text(ui.value);
            d3.selectAll('polygon').style('fill-opacity', 0.05*ui.value);
        }});
        //edge selection threshold
        $('#estslider').slider({min: 0.01, max:1.01, step:0.01, value: 1.01, slide: function( event, ui ) {
                $('#estvalue').text(ui.value);
                $('#connectormulti').data('public').applyEdgeHighlighting();
        }});
        //type of border encoding
        $('#borderEncoding').on('change', function(){
            $('#canvas').data('public').applyShadows();
        });

    }

    _constructor();
};