/**
 * Author: P. Meschenmoser
 * This class defines event handlers for UI elements belonging to metric properties.
 * It is also there for re-computing similitarity, after the initial similarity matrix.
 * Class constructed by main.js
 */
var Metricsettings = function(container, accessor, e_handler){
    var public = this;

    /*
        --Now--
        container: '#container_metrics'
        accessor: function, accessor to data layer. You need to send the cached documents to server for similarity computation!
        e_handler: function, central error handler
     */
    function _constructor(){
        _initEvents();
        $(container).data('public', public);
    }

    function _initEvents(){
        //init the selectmenu between 'cosine' and 'jaccard'
        $('#select_metric').selectmenu({width:70,
        change: function(){public.compute();}
        })
    }

    public.compute = function(metric){
        // this function recomputes similarity matrix for the current data layer.
        // metric can be either in ['cosine', 'jaccard'] or null. in the latter case,
        // the select menu's value is used.
        // it is needed, when the initial similarity matrix (returned by 2nd server call) is outdated.
        if (!metric) metric = $('#select_metric').val();
        $.post("/processor/run", {docs: accessor().getCache(), metric:metric}, 'json').done(function (l) {
            if (l.error){
                e_handler.toBox("Could not compute similarity/apply color scheme.");
                e_handler.toConsole("Could not compute similarity/apply color scheme", l.error);
            } else {
                var c = accessor().getCache();


                //update colors
                if (l.data.colored.length >0) {
                    c.forEach(function (d) {
                        delete d.background
                    }); //to be sure...
                    l.data.colored.forEach(function (colored) {
                        c[colored.index].background = colored.values;
                    });
                    accessor().setCache(c);
                }
                //compute ranks
                accessor().computeRanks(l.data.links);

                //update link list and graphics
                $('#canvas').data('public').setSimList(l.data.links);

            }
        });
    };

    _constructor();
};