/**
 * Author: P. Meschenmoser
 * This javascript is called, after require.js is configured.
 * It is used for basic initiating jQueryUI elements and configuring overall script components.
 */
//all this scripts are needed, c.f. init.js
define(["jquery", "jquery-ui", "d3", "misc/accordion", "layers/datalayer", "misc/errorhandler", "datatables.net",  "layers/vislayer",
    "events/importdia", "events/inputsettings", "events/vissettings", "events/metricsettings", "helper/vishelper",
    "helper/visinit", "helper/generalhelper", "d3-bboxCollide", "scrollbar"], function($) { //when scripts are loaded
    $(function() { // when page is ready
            var e_handler = new Errorhandler(); //same handler for each module

            initGUI(initEvents); //init basic GUI elements, then initEvents
            function initGUI(callback) {
                new Accordion('#accordion', {});
                $('#accordion').slideDown(function(){ //what happens after sliding down the accordion container?
                    //initiate jQueryUI components
                    $('button').button();
                    $('.sortable').sortable({revert: true, placeholder: "ui-state-highlight"});
                    $('.dia').dialog({
                        show: {effect: "fade", duration: 500},
                        hide: {effect: "fade", duration: 100},
                        resizable: false,
                        autoOpen: false,
                        width: 500
                    });
                    $('#dia_reader').dialog({height:500});
                    /*
                        Initiate jQueryUI tab for article reader.
                        Re-draw the in-ranks/out_rank data-table, when you change the tab.
                        This is needed, because data-tables.net has some issues with invisibles tables:
                        the header row's width would not be aligned corrected.

                     */
                    $('#tabs').tabs({activate: function(){
                        $('#tbl_inranks, #tbl_outranks').DataTable().draw();
                    }});
                    $('.slider').slider();
                    $('select').not('#select_articlemode').selectmenu({width: "50px"});
                    /* INITATE three data tables */
                    $('#tbl_overviewserver').DataTable({
                        paging: false,
                        info: false, //no 'displaying x/100 items'
                        scrollY: "80px"
                    });
                    $('#tbl_inranks, #tbl_outranks').DataTable({
                        paging: false,
                        info: false, scrollY: "300px"});

                    callback(); //i.e. initEvents;
                });
            }

            function initEvents() {
                var accessor = function () { //accessor for the data layer
                    return $('#header_data').data('public');
                };
                if (!$('#dia_import').data('public')) { //we didn't instantiate the import dialog so far.
                    new Importdia('#dia_import', e_handler, function (d, wasServerImport) {
                        //IMPORT CALLBACK:
                        //what shall happen after import?
                        if (!$('#canvas').data('public')) { //i.e. we need to instantiate a new vis layer.

                            //Init (expert|novice) mode:
                            var mode = (new Generalhelper()).getURLParameter('mode');
                            //Catch empty or invalid URL parameters:
                            if (!mode || ['expert','novice'].indexOf(mode) === -1) mode = 'expert';
                            if (mode === 'novice'){
                                $('.expert').hide();
                                //change URL (without reload!):
                                window.history.pushState('VAND', 'Title', '/?mode=novice');
                                $('#btn_togglemode').button('option', 'label', 'Set Expert Mode');
                            } else {
                                window.history.pushState('VAND', 'Title', '/?mode=expert');
                            }
                            $('#btn_togglemode').show();

                            $('#accordion').data('public').deflateAll();
                            //Instantiate the vislayer with most of the default settings:
                            new Vislayer('#canvas', {dataAccessor: accessor, mode:mode});
                        }
                        if (wasServerImport) {
                            //server-side import, i.e. links already computed
                            $('#canvas').data('public').setSimList(d.links);
                            accessor().computeRanks(d.links);
                        } else { //client-side import, compute similarity matrix then. see metricsettings.js
                            $('#container_metrics').data('public').compute();
                        }
                        $('#dia_import').data('public').close(); //adios
                    });//end AFTER IMPORT CALLBACK
                } else {
                    $('#dia_import').data('public').open();
                }
                //Event handler for switching between novice and expert mode:
                $('#btn_togglemode').on('click', function(){
                    $('.expert').slideToggle(); //toggle UI elements in the accordion
                    if ($(this).text() === 'Set Expert Mode'){ //expert mode requested
                        $('#canvas').data('public').setMode('expert');//apply mode
                        //it might be required to recompute the similarity matrix, c.f. metricsettings.js
                        if ($('#select_metric').val() !== 'cosine') $('#container_metrics').data('public').compute();
                        $(this).text('Set Novice Mode'); //change button text
                        window.history.pushState('VAND', 'Title', '/?mode=expert'); //Change url parameter
                    } else { //novice mode requested
                        //analogous to above
                        $('#canvas').data('public').setMode('novice');
                        if ($('#select_metric').val() !== 'cosine') $('#container_metrics').data('public').compute('cosine');
                        $(this).text('Set Expert Mode');
                        window.history.pushState('VAND', 'Title', '/?mode=novice');
                    }
                });
                //init remaining event classes
                new Inputsettings('#container_data', e_handler);
                new Metricsettings('#container_metrics', accessor, e_handler);
                new Vissettings('#container_vissettings', e_handler)
            }
        });

});