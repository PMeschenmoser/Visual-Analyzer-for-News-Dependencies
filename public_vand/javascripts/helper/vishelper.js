/**
 * Author: P. Meschenmoser
 * This class gathers helper functions, belonging directly to the visualisation layer but being independent from this.
 * Constructed in vislayer constructor.
 */

var Vishelper = function(options){
    var public = this;
    /*
        option's only property is the data accessor function currently.
     */
    var generalHelper = new Generalhelper(); //needed to format the date in article tooltips
    var _options = {dataAccessor: function(){}}; //default option

    function _constructor(){
        for (var key in options) {
            if (options.hasOwnProperty(key) && _options.hasOwnProperty(key)) _options[key] = options[key];
        }
    }

        public.getTransformation = function(transform) {
            /*
                transform is the result from d3.select(this).attr('transform')
                this function makes a beautiful object of those transform strings.
                in d3 v4 this function is no longer part of the actual library.
                c.f. http://stackoverflow.com/questions/38224875/replacing-d3-transform-in-d3-v4/38230545
                Thanks to altocumulus.
             */
            // Create a dummy g for calculation purposes only. This will never
            // be appended to the DOM and will be discarded once this function
            // returns.
            var g = document.createElementNS("http://www.w3.org/2000/svg", "g");

            // Set the transform attribute to the provided string value.
            g.setAttributeNS(null, "transform", transform);

            // consolidate the SVGTransformList containing all transformations
            // to a single SVGTransform of type SVG_TRANSFORM_MATRIX and get
            // its SVGMatrix.
            var matrix = g.transform.baseVal.consolidate().matrix;

            // Below calculations are taken and adapted from the private function
            // transform/decompose.js of D3's module d3-interpolate.
           // var {a, b, c, d, e, f} = matrix;   // ES6, if this doesn't work, use below assignment
            var a=matrix.a, b=matrix.b, c=matrix.c, d=matrix.d, e=matrix.e, f=matrix.f; // ES5
            var scaleX, scaleY, skewX;
            if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
            if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
            if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
            if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
            return {
                translateX: e,
                translateY: f,
                rotate: Math.atan2(b, a) * Math.PI/180,
                skewX: Math.atan(skewX) * Math.PI/180,
                scaleX: scaleX,
                scaleY: scaleY
            };
        };

        public.showTooltip = function(identifier, d, matrix){
            //identifier: in ['#edgetip','#articletip']
            //d: data object of the hovered
            //matrix: CTM matrix, defined if identifier === '#tooltip'
            d3.selectAll(identifier).transition().duration(200).style("opacity", .9);
            if (identifier === '#edgetip') {
                d3.selectAll(identifier).html("s = "+Math.round(d.value * 100) / 100) //round similarity to 2 decimals
                    .style("left", (d3.event.pageX) + "px") //translate tooltip above the mouse position
                    .style("top", (d3.event.pageY - 15  ) + "px");
            } else if (identifier === '#articletip'){
                // In contrast to #edgetip, this tooltip gets translated to the hovered article's boundary.
                // the CTM is used to get the exact translate values.
                // c.f. http://fiddle.jshell.net/tPv46/89/. Thanks to AmeliaBR.
                d3.selectAll('#articletip').html(generalHelper.dateformat(d.date))
                    .style("left", window.pageXOffset + matrix.e+12 + "px")
                    .style("top", window.pageYOffset + matrix.f-10 + "px");
            }
        };

        public.closeTooltip = function(identifier){
            //identifier in ['#edgetip', '#articletip']
            d3.selectAll(identifier).transition().duration(200).style("opacity", 0);
        };

        public.onArticleClick = function(d){
            // d: clicked article's data object
            if (d3.event.ctrlKey || d3.event.altKey || d3.event.shiftKey || d3.event.metaKey) {
                //when one of the keys is pressed simultaneously to the click, color all edges belonging to clicked
                // article. It's important to remember, which articles triggered such an edge coloring:
                // Select article A and B, then unselect B: you won't want to unhighlight those edges,
                // belonging to B but also to A!

                var isTrigger = d3.select(this).classed('highlight_trigger');
                var allTrigger = [];
                d3.selectAll('.highlight_trigger').each(function(d){allTrigger.push(d.id)});

                var node_data = d;
                if (!isTrigger){ //highlight
                    //highlight any edge, where the selected article is either source or target:
                    d3.selectAll('.link').filter(function(d){
                        return d.source.id === node_data.id || d.target.id === node_data.id})
                        .classed('link_highlighted',true);
                    d3.select(this).classed('highlight_trigger',true);
                } else { //unhighlight
                    //unhighlight any edge, with the clicked = link.src/target article.
                    // BUT!!! the remaining link attribute may not reference an article with .highlight_trigger!
                    d3.selectAll('.link_highlighted').filter(function(d){
                        return (d.source.id === node_data.id && allTrigger.indexOf(d.target.id) === -1)
                            ||  (d.target.id === node_data.id && allTrigger.indexOf(d.source.id) === -1)
                    }).classed('link_highlighted',false);
                    d3.select(this).classed('highlight_trigger',false);
                }
            } else { //simple left-click
                _setArticleReaderData(d);
            }
        };

        function _setArticleReaderData(d){
            //update article reader content and open it
            var d_article = _options.dataAccessor().getFromCache(d.id);
            $('#reader_text').html('('+d_article.source+') '+d_article.content); $('#reader_heading').html(d_article.title);
            $('#reader_img').attr('src',d_article.image);
            //$('#reader_src').html('('+d_article.source+')');

            var ranks = _options.dataAccessor().getRanks();

            //set content for in-ranks data table:
            var tbl_inranks = $('#tbl_inranks').DataTable();
            tbl_inranks.clear();
            ranks.in.forEach(function(row,i){tbl_inranks.row.add([(i+1),row.title, row.score]);});
            tbl_inranks.draw();

            //set content for out-ranks data table:
            var tbl_outranks = $('#tbl_outranks').DataTable();
            tbl_outranks.clear();
            ranks.out.forEach(function(row,i){tbl_outranks.row.add([(i+1),row.title, row.score])});
            tbl_outranks.draw();

            //find rank of clicked article, for inranks::
            var selected_inrank = 0;
            for (var i =0; i<ranks.in.length; i++ ){
                if (parseInt(ranks.in[i].id) === d.id)selected_inrank = i+1;
            }
            //find rank of clicked article, for outranks::
            var selected_outrank = 0;
            for (var i =0; i<ranks.out.length; i++ ){
                if (parseInt(ranks.out[i].id) === d.id)selected_outrank = i+1;
            }

            //color the table row with the appropiate rank, for inranks:
            $('#tbl_inranks tbody').children('tr').each(function(){
                var current_rank = parseInt($(this).children('td').first().html());
                if (selected_inrank === current_rank)$(this).addClass('selected');
            });

            //color the table row with the appropiate rank, for outranks:
            $('#tbl_outranks tbody').children('tr').each(function(){
                var current_rank = parseInt($(this).children('td').first().html());
                if (selected_outrank === current_rank)$(this).addClass('selected');
            });

            $('#dia_reader').dialog('open');
        }

        public.getDefaultOptions = function(){
            //called in the vislayer constructor
            // this default values are analogous to the values defined by the jQuery UI
            // objects defined in metricsettings, vissettings, etc.
            return {dataAccessor: _options.dataAccessor, //function, reference to data layer
                mode: 'expert', // or 'novice'
                padding :{left: 15, right:47, top:5, bottom:0}, //visualisation padding
                article_mode: 'm', // in ['n', 's', 'm', 'l', 'auto']
                article_width:{n:30, s:100, m:180, l:380}, //width/height in px for the selected article_mode
                article_height:{n:30, s:40, m:70, l:140}, //c.f. _computeRectSize() in visualisation layer
                alpha: 0.9,
                edge:{type:'linear', width:10, threshold:0, opacity:1.0},
                repulsion:{ strength:0.0002},
                timeToX:true};
        };

    _constructor();
};