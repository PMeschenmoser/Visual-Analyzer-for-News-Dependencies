/**
 * Author: P. Meschenmoser
 *  This class initiates event handlers for UI elements to manipulate the visualisation.
 *  In addition, it has some private helper functions to gather element values (_getEdgeSettings()
 *  and _getRepulsionSettings()).
 */

var Vissettings = function(container, e_handler){
    var public = this;

    /*
        --Now--
        container: '#container_vissettings'
        e_handler: function, central error handler

     */
    function constructor(){
        initEvents();
        $(container).data('public', public);
    }

    function initEvents(){
        //select between ['none', 'source', 'title', 'detailed', 'auto']
        // correspondingly, possible values for .val() are ['n', 's', 'm', 'l', 'auto']
        $('#select_articlemode').on('change', function(){
            var val = $('#select_articlemode option:selected').val();
            vis().setArticleMode(val);
        });
        /*
            For every slider, except the one for repulsion strength,
            I'm catching the _ON SLIDE_ event, for an immediate graphics update.
            the 'change' events fires when sliding has completely finished.
            In my html code, there's always a <span> element above the slider.
            This is accessed on change/slide events to set the selected value in this text field.
         */
        $('#slider_alpha').slider({min:0.1,
            max:1,
            value:0.9,
            step:0.01,
            slide:function(_,ui){
                $(this).prevAll('span').first().text('(' + ui.value + ')');
                vis().setAlpha(ui.value);
            }
        });

        //Update edge properties. In slide event, we gather all edge properties, as it wouldn't be nice
        // to add setter functions for every single attribute!
        $('#slider_edgewidth').slider({min:1,
            max:30,
            value:10,
            step:1,
            slide:function(_,ui){
                $(this).prevAll('span').first().text('(' + ui.value + ')');
                vis().setEdges(_getEdgeSettings());
            }
        });
        $('#slider_edgethreshold').slider({min:0,
            max:1,
            value:0,
            step:0.01,
            slide:function(_,ui){
                $(this).prevAll('span').first().text('(' + ui.value + ')');
                vis().setEdges(_getEdgeSettings());
            }
        });
        $('#slider_edgeopacity').slider({min:0.1,
            max:1,
            value:0.6,
            step:0.1,
            slide:function(_,ui){
                $(this).prevAll('span').first().text('(' + ui.value + ')');
                vis().setEdges(_getEdgeSettings());
            }
        });
        $('#select_scaletype').selectmenu({ //edge scale type! value in ['linear', 'square', 'cubic', 'log']
            width:70,
            change: function(){
                vis().setEdges(_getEdgeSettings());
            }
        });
        $('#slider_repstrength').slider({min:0.0001, //slider for repulsion strength
            max:10,
            step:0.001,
            value:0.0002,
            slide: function(_,ui){ //set selected value to span
                $(this).prevAll('span').first().text('(' + ui.value + ')');
            },
            change: function(){ //update simulation!
                vis().setRepulsion(_getRepulsionSettings());
            }
        });

        $('#btn_unhighlight').on('click', function(){ //button, unhighlight all edges
            vis().unhighlightEdges();
        });

        $('#timetox').on('click', function(){  //checkbox
            vis().toggleAxes();
        });
        //on create, set label tip in the span above (i.e. with the default value)
        $( ".slider" ).each( function() {
            $(this).prevAll('span').first().text('('+$(this).slider('option', 'value')+')');
        } );
    }

    function _getEdgeSettings(){
        //gather edge properties, as we dont want setter functions for each property.
        return {type:$('#select_scaletype').val(), threshold:$('#slider_edgethreshold').slider('option','value'), width: $('#slider_edgewidth').slider('option','value') , opacity:$('#slider_edgeopacity').slider('option','value') }
    }

    function _getRepulsionSettings(){
        //c.f. getEdgeSettings- the simulation could be parametrized with a lot of more parameters
        return { strength: $('#slider_repstrength').slider('option','value')}
    }

    function vis(){
        return $('#canvas').data('public');
    }

    constructor();

};