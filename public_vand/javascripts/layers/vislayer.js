/**
 * Author: P. Meschenmoser
 * 
 * This layer is the central component for canvas (svg) manipulation.
 * It loads references to very basic components (e.g. scales, axes) from the helper/Visinit.js
 * Whenever new data is imported (via public.setSimlist(d)), I send reduced
 * data objects (for links and nodes) to the HTML5 web worker(.js). When the worker
 * returns node positions, the graphics get updated correspondingly (c.f. constructor).
 * This class includes handlers for brushing, zooming, resizing and multiple small setter functions. 
 */

var Vislayer = function(container, options){
    var public = this;
    var _options;// filled by the help of Vishelper.js class
    /*
        _defaultOptions are assigned, when there's a switch from expert mode to novice mode.
        They are needed for a simple switch from novice to expert mode afterwards!
        c.f. public.setMode(mode)
     */
    var _defaultOptions ={};
    var _visHelper, _generalHelper,  _worker;
    var _links; //assigned in public.setSimlist()

    //assigned by the help of the Visinit class, in _initGraphics():
    var _scale = {temporal:{focus: function(){}, context: function(){}}, linear:{focus: function(){}, context: function(){}}, edge: function(){}};
    var _graph, _xSubgraph, _ySubgraph; // the subgraph g's are for the context visualisations
    var _articleContainer, _linkContainer; //handler to further <g>'s
    var _xBrush, _yBrush, _lastBrush, _clip; //_lastBrush in ['x','y']. Assigned while using the corresponding brush.
    var _zoom; //(func)
    var _xRange, _yRange; //(func)
    var _initialNodePos = true; //don't animate edges after import (i.e. at _initialNodePos)

    function _constructor(){
        //get default options from vishelper:
        _visHelper = new Vishelper({dataAccessor:options.dataAccessor});
        _defaultOptions.expert = _visHelper.getDefaultOptions();
        _defaultOptions.novice = _visHelper.getDefaultOptions();
        _options = (options.mode === 'novice')? _defaultOptions.novice : _defaultOptions.expert;
        //Merge the user-given "options" with the default "_options;"
        for (var key in options){
            if (options.hasOwnProperty(key) && _options.hasOwnProperty(key)) _options[key] = options[key];
        }

        _generalHelper = new Generalhelper(); //we need (e.g.) the dateformat function from here

        _worker = new Worker("javascripts/misc/worker.js"); //init HTML5 web worker
        _worker.onmessage=  function(m){
            //worker response (to msg sent in _updateGraphics(), c.f. last line of worker.js)

            _updateArticleData(m.data.nodes);
            _updateLinkData(m.data.links);
            //transform containers/links
            _articleContainer.selectAll('.article').call(_transformArticles,true);
            _linkContainer.selectAll('.link').call(_transformLinks,!_initialNodePos);
            _setRectHelpers(); //move blue rectangles in context visualisation
            //set dimensions/content of containers.
            //needed here, because: when you change the article mode, the simulation gets updated
            // with respect to new bounding boxes
            _setContent();
            public.colorize();
            _initialNodePos = false;
        };
        _initGraphics(); //re-assign variables from Visinit.js
        _onResize(true); //complement these referenced elements wrt. the current canvas dimensions
        d3.select(window).on('resize', function(){_onResize(false)}); //resize handler
        $(container).data('public', public); //bind public functions to #canvas.
    }

    function _initGraphics(){
        //This functions re-assigns variables that are returned by Visinit.js
        var i = (new Visinit()).run(container, _options);
        _xRange = i._xRange; _yRange= i._yRange; _scale = i._scale;
        _graph = i._graph; _xSubgraph = i._xSubgraph; _ySubgraph = i._ySubgraph;
        _linkContainer = i._linkContainer; _articleContainer = i._articleContainer;
        _xBrush = i._brush; _yBrush = i._brush2; _clip = i.clip; _zoom = i._zoom;
        //add brush and zoom handler:
        _xBrush.on('brush start', function(){_lastBrush = 'x'}).on('brush', function(){_onBrushEnd()});
        _yBrush.on('brush start',function(){_lastBrush = 'y'}).on('brush', function(){_onBrushEnd()});
        _zoom.on("zoom",  _onZoomEnd);
    }

    function _onResize(firstResize){
        //firstResize (bool): first call is programmatically, not by an event. There, we don't want to wait 250ms.
        // for later resizing: As the event 'resize-end' is not available, we are using a work-around with timeouts
        // c.f. http://stackoverflow.com/questions/5489946/
        // jquery-how-to-wait-for-the-end-of-resize-event-and-only-then-perform-an-ac
        clearTimeout(window.resizedFinished);
        window.resizedFinished = setTimeout(function(){
            var dim = d3.select(container).node().getBoundingClientRect();
            //new _xRange and _yRange:
            _xRange = [0, dim.width - _options.padding.left - _options.padding.right];
            _yRange = [dim.height - _options.padding.top - _options.padding.bottom -45, 0];
            //transform axes:
            _graph.select('.x.axis').attr('transform', 'translate(0,' + _yRange[0] + ')');
            _graph.select('.y.axis').attr('transform', 'translate('+_xRange[1]+',0)');
            //and context visualisations:
            _xSubgraph.attr('transform', 'translate(0,' + (_yRange[0]+20) + ')').attr('opacity', 1);
            _ySubgraph.attr('transform', 'translate('+(_xRange[1]+10)+',0)').attr('opacity', 1);;
            d3.selectAll('.axis').attr('opacity',1); //for first resize
            //needed for brushing and zooming:
            _clip.attr('width',_xRange[1] ).attr('height', _yRange[0]);
            _zoom.translateExtent([[0, 0], [_xRange[1]+62, _yRange[0]+50]]);
            _graph.selectAll('.zoom').attr('width',_xRange[1] ).attr('height', _yRange[0]).call(_zoom);

            _updateScales(_scale.temporal.context.domain());
            if (!firstResize) _updateGraphics(); //if (firstResize) -> update already after public.setSimlist();
        }, firstResize ? 0 : 250);
    }

    function _updateGraphics(){
        //reset brush to its full size
        _xSubgraph.select('.brush').call(_xBrush.move, _xRange  );
        _ySubgraph.select('.brush').call(_yBrush.move, [_yRange[1], _yRange[0]]);
        _graph.select(".zoom").call(_zoom.transform, d3.zoomIdentity.scale(1));

        //Gather package that will be sent to worker.js:
        var dateinfo = _options.dataAccessor().getDateInfo();
        _updateScales(dateinfo.extent); //dateinfo.extent = [minDate, maxDate]

        var workeroptions = {strength: _options.repulsion.strength,
            //you cannot send functions to web workers, so it is required to define the time scale again there:
            timeDomain: _scale.temporal.context.domain(), timeRange:_scale.temporal.context.range(),
            xRange: _xRange, yRange:_yRange, //e.g. needed to center the simulation
            width:_options.article_width[_computeRectSize()], height: _options.article_width[_computeRectSize()],
            timeToX: _options.timeToX
        };
        //nodes= [{id:x, date: y}], links c.f. public.setSimlist()
        var pars = {nodes: dateinfo.dates, links:_links , options:workeroptions};
        _worker.postMessage(pars);
    }

    function _updateArticleData(data){
        //This function updates the visual representation of the worker's returned m.data.nodes
        //data join:
        var join = _articleContainer.selectAll('g').data(data);
        //append new articles:
        var newArticles =  join.enter().append('g').attr('class','article')
            .attr('transform', function(d){
                //Set an initial translation, so that the tween animation after the first simulation works.
                if (_options.timeToX) return 'translate('+_scale.temporal.context(d.date)+','+ (_yRange[0]/2) + ')';
                return 'translate('+(_xRange[1]/2) + ',' + _scale.temporal.context(d.date) + ')';
            })
            .on('contextmenu', function(){ //i.e. on right-click:
                d3.event.preventDefault(); // don't show context menu
                /*
                 Move clicked article to the front.
                 C.f. http://bl.ocks.org/eesur/4e0a69d57d3bfc8a82c2
                 */
                this.parentNode.appendChild(this);
            }).on('click', _visHelper.onArticleClick).on('mousemove', function(d){
                //on mousemove always works better than mouseenter!
                //call _onArticleHover with the articles data and tell that the event was no mouseout
                _onArticleHover(d, false);
            }).on('mouseleave', function(d){ _onArticleHover(d, true)});//analogous
        //for each new article, append an svg:foreign objects and basic html:
        newArticles.append('foreignObject').append("xhtml:body").attr('opacity', _options.opacity).html("<div class='article_container'><div class='article_wrapper'></div></div>");
        join.exit().remove(); //remove old articles that are no longer in the date object
    }

    function _updateLinkData(data){
        //This function updates the representation of the worker's returned m.data.links
        //The edge scale's domain always looks at the current min, max similarity values!
        _scale.edge.domain(d3.extent(data, function(e){return e.value}));
        var join_links = _linkContainer.selectAll('line').data(data); //data join
        join_links.exit().remove(); //remove old links
        join_links.enter().append('line') //enter new links
            .attr('class', 'link')
            .on('mousemove', function(d){_visHelper.showTooltip('#edgetip',d)})
            .on('mouseleave',function(){_visHelper.closeTooltip('#edgetip');});
        _updateLinkVisuals();
    }

    function _updateLinkVisuals(){
        //this function updates the edge style with respect to the current settings in _options.edge
        //called after _updateLinkData and public.setEdgeSettings()
        _scale.edge.range([1,_options.edge.width]); //max width to edge scale range
        _linkContainer.selectAll('line')
            .attr('stroke-width', function(d){return  _scale.edge(d.value);}) //make edges (less) thicker
            .attr('opacity', 1.0)
            //.attr('opacity', _options.edge.opacity)
            .attr('display', function(d){
                //hide edge, if similarity lower than threshold
                if (d.value < _options.edge.threshold) return 'none';
                return 'block';
            });
    }

    function _onBrushEnd(){ //called after moving or resizing the brush handlers
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
        if (d3.event.selection && d3.event.sourceEvent && _lastBrush){ //brush by a 'true' event
            var range =  d3.event.selection;
            if ((_lastBrush === 'x' && _options.timeToX) || (_lastBrush === 'y' && !_options.timeToX)){ //brushing on a temporal scale:
                if (_lastBrush === 'y') range = range.reverse(); // because values are flipped for the y-axis
                //update focus scale (c.f. d3 docu):
                _scale.temporal.focus.domain(range.map(_scale.temporal.context.invert, _scale.temporal.context));
            } else {
                //brushing on linear scale:
                _scale.linear.focus.domain(range.map(_scale.linear.context.invert, _scale.linear.context));
            }
            //synchronize zoom behavior to updated brush properties:
            var s = (_options.timeToX) ? _xRange[1]/(range[1] - range[0]) : _yRange[0]/(range[0] - range[1]); //zoom factor
            var t1 = (_options.timeToX) ? -range[0] : 0; //translate value for x
            var t2 = (!_options.timeToX) ? -range[1] : 0; //translate value for y
            _graph.select(".zoom").call(_zoom.transform, d3.zoomIdentity.scale(s).translate(t1, t2));
        } else {
            //for initialisation:
            _scale.temporal.focus.domain(_scale.temporal.context.range().map(_scale.temporal.context.invert, _scale.temporal.context));
            _scale.linear.focus.domain(_scale.linear.context.range().map(_scale.linear.context.invert, _scale.linear.context));
        }
        //Update focus axes:
        if (_options.timeToX){
            _graph.select('.x.axis').call(d3.axisBottom(_scale.temporal.focus));
            _graph.select('.y.axis').call(d3.axisRight(_scale.linear.focus));
        } else {
            _graph.select('.y.axis').call(d3.axisRight(_scale.temporal.focus));
            _graph.select('.x.axis').call(d3.axisBottom(_scale.linear.focus));
        }
        //Transform links/articles according to new focus scale and rotate labels.
        _articleContainer.selectAll('.article').call(_transformArticles,false);
        if (_options.article_mode === 'auto') _setContent(); //semantic zoom
        _linkContainer.selectAll('.link').call(_transformLinks,false);
        _rotateLabels();
    }

    function _onZoomEnd(){
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return;
        var t = d3.event.transform;
        //quite analogous to _onBrushEnd().
        //Zooming is done only on the current time scale
        if (_options.timeToX){  //rescale scale on x
            _scale.temporal.focus.domain(t.rescaleX(_scale.temporal.context).domain());
            _graph.select('.x.axis').call(d3.axisBottom(_scale.temporal.focus));
            var newFocus = _xRange.map(t.invertX, t);
            //Move brush:
            // Avoid brush handlers exceeding the xRange/yRange
            // newFocus[0] was sometimes -30 when zooming out again
            // So, we simply use Math.min, and Math.max:
            _xSubgraph.selectAll('.brush').call(_xBrush.move, [Math.max(0,newFocus[0]),Math.min(newFocus[1],_xRange[1])]);
        } else { //rescale scale on y
            _scale.temporal.focus= d3.event.transform.rescaleY(_scale.temporal.context);
            _graph.select('.y.axis').call(d3.axisRight(_scale.temporal.focus));
            var newFocus = [_yRange[1], _yRange[0]].map(t.invertY, t);
            _ySubgraph.selectAll('.brush').call(_yBrush.move, [Math.max(0,newFocus[0]),Math.min(newFocus[1],_yRange[0])])
        }
        _articleContainer.selectAll('.article').call(_transformArticles,false);
        if (_options.article_mode === 'auto') _setContent();
        _linkContainer.selectAll('.link').call(_transformLinks,false);
        _rotateLabels();
    }

    function _rotateLabels(){
        //Rotates the labels for two y-axes. The transform cannot be included in CSS.
        //called on the end of an zoom/brush event
        _graph.selectAll('.y.axis text').attr("transform", 'translate(-8,-2)rotate(45)').style('text-anchor', 'end');
        _ySubgraph.selectAll('.y.axis text').attr("transform", 'translate(5,10)rotate(300)').style('text-anchor', 'start');
    }
    function _transformArticles(selection, withTransition){
        //updates article translate
        //call via  _articleContainer.selectAll('.article').call(_transformArticles,false);
        //we don't a transition after zooming or brushing, only on worker's response
        var transition = (withTransition) ? selection.transition().duration(500) : selection;
        if (_options.timeToX) {
            //offsets are used to center the articles
            transition.attr('transform', function (d) {
                return 'translate(' + (_scale.temporal.focus(d.date) - _options.article_width[_computeRectSize()]/ 2) + ',' +( _scale.linear.focus(d.y)-_options.article_height[_computeRectSize()]/ 2)  + ')';
            });
        } else { //time scale at y axis
            transition.attr('transform', function (d) {
                return 'translate(' + (_scale.linear.focus(d.x)-_options.article_width[_computeRectSize()]/ 2) + ',' + ( _scale.temporal.focus(d.date)   - _options.article_height[_computeRectSize()]/ 2) + ')'
            });
        }
    }

    function _onArticleHover(d, out){
        //d is a article's data object, out indicated mouseenter/mousemove or mouseleave
        var that = d.id;
        //(un)highlight the blue rectangles:
        _xSubgraph.selectAll('.article_small').call(highlightSmalls);
        _ySubgraph.selectAll('.article_small').call(highlightSmalls);

        //define tooltip function:
        var articlefunc;
        if (out) {
            articlefunc = function(d){_visHelper.closeTooltip('#articletip',d )};
        } else { //on mouseenter/mousemove
            articlefunc = function(d){
                            //c.f. _visHelper.showTooltip for further explanaton
                            var matrix = this.getScreenCTM()
                                         .translate(+this.getAttribute("cx"), +this.getAttribute("cy"));
                            _visHelper.showTooltip('#articletip',d,matrix)
                            }
        }
        //apply tooltip function to all article container with that id:
        _articleContainer.selectAll('.article').filter(function(d){return d.id === that}).each(articlefunc);
        function highlightSmalls(sel){
            //scale and translate blue rectangles for articles with _that_ ID.
            var dim = out ? 5 : 10;
            var shift = out ? 0 : 2.5; //we have an initial shift of 2.5
            sel.filter(function(d){return d.id === that}).transition().duration(50)
                .attr('stroke', out ? 'none' : 'black')
                .attr('width', dim).attr('height', dim)
                .attr('transform', function(){
                    /*
                     Idea: Save the original transform value and add an additional
                     shift to the rectangle, if it gets enlargened. This way of
                     implementation is cleaner than using a 'continuous' transform
                     update.
                     */
                    var initial = _visHelper.getTransformation(d3.select(this).attr('initialTransform'));
                    return 'translate('+(initial.translateX - shift ) + ',' + (initial.translateY-shift) +')';
                });
        }
    }

    function _transformLinks(selection, withTransition){
        //call analogous to _transformArticles
        var transition = (withTransition) ? selection.transition().duration(500) : selection;
        //Note that we don't need translate offsets here, as the articles' d.x/d.y is already the actual center
        if (_options.timeToX) {
            transition.attr('x1', function(d){
                return _scale.temporal.focus(d.source.date) })
                .attr('y1', function(d){ return _scale.linear.focus(d.source.y)})
                .attr('x2', function(d){ return _scale.temporal.focus(d.target.date)})
                .attr('y2', function(d){return _scale.linear.focus(d.target.y)});
        } else { //time scale at y axis
            transition.attr('x1', function(d){ return _scale.linear.focus(d.source.x)})
                .attr('y1', function(d){ return _scale.temporal.focus(d.source.date) })
                .attr('x2', function(d){ return _scale.linear.focus(d.target.x)})
                .attr('y2', function(d){ return _scale.temporal.focus(d.target.date)});
        }
    }

    public.setArticleMode = function(val){
        //val in ['n','m', 's', 'l', 'auto']
        _options.article_mode = val || _options.article_mode; //catch empty val
        _updateGraphics();
    };

    function _setContent(){
        //This function generates and sets the actual HTML content for articles:
        //update foreign object dimensions to the new article mode dimensions
        _articleContainer.selectAll('foreignObject').transition().duration(500)
            .attr('width', _options.article_width[_computeRectSize()])
            .attr('height', _options.article_height[_computeRectSize()]);
        if (_computeRectSize() === 'n'){ //no text desired
            _articleContainer.selectAll('.article_wrapper').html('');
            _articleContainer.selectAll('.chromeimgfix').remove();
            return; //that's it
        }
        var main;
        var extra;
        if (_computeRectSize() === 's') {
            main = 'source';
        } else if (_computeRectSize() === 'm') {
            main = 'title';
        } else {
            main = "content";
            extra = "image";
        }
        _articleContainer.selectAll('.article_wrapper').html(function(){
            var d = d3.select(this.parentNode.parentNode).datum();
            var content = _options.dataAccessor().getFromCache(d.id)[main];
            var addendum = extra ? 'text_wide' : '';
            var innerhtml = "<div class='article_text "+ addendum +"' style='float:left;text-align:justify'>" + ((content && content.length>0) ? content : "Missing Input Data") + "</div>";
            if (extra){ //generate html for detail mode
                var img = (_generalHelper.getBrowserCompatibility()) ? _options.dataAccessor().getFromCache(d.id)[extra] : ''; //chrome foreign object fix
                var addendum =  (_generalHelper.getBrowserCompatibility()) ? '' : 'height:70%'; //chrome foreign object fix
                var title = "<div class='article_title'>" + _options.dataAccessor().getFromCache(d.id).title +"</div>";
                var src = "<div class='article_source'>" + _options.dataAccessor().getFromCache(d.id).source +"</div>";
                innerhtml = "<div class='article_left' style='float:left;"+addendum+"'><img width='100%' src='"+img+"'/>"+src+"</div><div class='article_right' style='float:left;'>"+title+ innerhtml+"</div>" ;
            }
            return innerhtml;
        });
        if (_generalHelper.getBrowserCompatibility()){
            //custom scrollbar supported in firefox and chrome
            $(".article_text").mCustomScrollbar({axis:'y', theme:'dark', scrollInertia:1500});
        } else {
            //chrome wont position <img> in the foreign object correctly
            //so, add svg:image instear
            if (_computeRectSize() === 'l') {
                _articleContainer.selectAll('.article').append("svg:image")
                    .attr('class', 'chromeimgfix')
                    .attr("xlink:href", function (d) {
                        return _options.dataAccessor().getFromCache(d.id)["image"];
                    })
                    .attr("width", 130).attr('y',20).attr('x',15);
            } else {
                _articleContainer.selectAll('.chromeimgfix').remove();
            }
        }
    }
    public.setAlpha = function(val){
        //val in [0,1]
        _options.alpha = val || _options.alpha;
        _articleContainer.selectAll('foreignObject').attr('opacity', _options.alpha);
    };

    public.setRepulsion = function(settings){
        //settings has currently only the property strength (in [0.0001,10]
        //this is the general power behind the simulation
        _options.repulsion.strength = settings.strength || _options.repulsion.strength;
        _updateGraphics();
    };

    public.setEdges = function(settings){
        //Set scale type (in ['linear', 'sqrt', 'cubic', 'log']), edge opacity, width and threshold
        _options.edge.type = settings.type || _options.edge.type;
        _options.edge.opacity = settings.opacity || _options.edge.opacity;
        _options.edge.width = settings.width || _options.edge.width;
        _options.edge.threshold = settings.threshold || _options.edge.threshold;

        //redefine edge scale:
        if (_options.edge.type === 'linear'){
            _scale.edge = d3.scaleLinear();
        } else if (_options.edge.type === 'square') {
            _scale.edge = d3.scalePow().exponent(0.5)
        } else if (_options.edge.type === 'cubic'){
            _scale.edge = d3.scalePow().exponent(1/3);
        } else {
            _scale.edge = d3.scaleLog();
        }
        //it is not required to call _updateGraphics() here:
        _updateLinkVisuals();
    };

    public.setSimList = function(links){
        //This function is called, whenever we add new similarity/article data.
        // links is like a triangular matrix with this shape: [{source:ID(int), target:ID(int), value: double}]
        _links = links;
        _initialNodePos = true;
        _updateGraphics();
    };

    public.unhighlightEdges = function(){
        //.highlight_trigger are clicked articles (i.e. which trigger the actual highlighting)
        // this class is especially needed, when you highlight edges for two nodes and deselect one trigger node sub-
        //sequently
        _articleContainer.selectAll('.highlight_trigger').classed('highlight_trigger', false);
        //all edges are colored black again:
        _graph.selectAll('.link_highlighted').classed('link_highlighted', false);
    };

    public.toggleAxes = function(){
        //toggles scales for x and y axes. It is only needed to toggle the following variable, as everything else
        //gets already implemented in _updateGraphics (resp. _updateScales, etc)
        _options.timeToX= !_options.timeToX;
        _updateGraphics();
    };

    public.setMode = function(mode){
       //mode in ['expert', 'mode']
       if (mode === 'novice'){
           //save current expert settings, to make a simple switch from novice to expert afterwards
           if (_options.mode === 'expert') _defaultOptions.expert = _options;
           //we need to apply options, which are available in both modes and were changed in one, to both option types
           _defaultOptions.novice.article_mode = _options.article_mode;
           _defaultOptions.novice.timeToX = _options.timeToX;
           _options = _defaultOptions.novice;
           _options.mode = mode;
       } else { //switch to expert
           _defaultOptions.novice = _options; // save old settings
           //analogous to above:
           _defaultOptions.expert.article_mode = _options.article_mode;
           _defaultOptions.expert.timeToX = _options.timeToX;
            _options = _defaultOptions.expert;
            _options.mode = 'expert'
       }
       //update visualisation. For now, it is sufficient to update the following:
        public.setEdges({threshold:_options.threshold});
        public.setAlpha();
        _updateGraphics();
    };

    public.colorize = function(){
        //apply d.background  ([r,g,b,a]) to overlays of articles having this property
        d3.selectAll('.article_wrapper').style('background-color', function(){
            var id = d3.select(this.parentNode.parentNode).datum().id; //article id
            var d = _options.dataAccessor().getFromCache(id); //full data object
            if (d.hasOwnProperty('background')){
                return 'rgba('+d.background.toString() + ')';
            }
            return 'rgba(0,0,0,0)';
        });
    };

    function _updateScales(extent){
        //This function updates all scales in _scale, but not _scale.edge. extent has the form [dateMin, dateMax]
        function _setTimePadding(scale){ //inner function, scale is a temporal scale
            //this function extends the current time domain, so that article are not cropped off at the boundaries
            //notice, that's a different thing than d3.scale.nice() would do!
            var old = scale.domain();
            var padding = _options.timeToX ? _options.article_width : _options.article_height;
            var factor = _options.timeToX ? 1 : -1;
            //first, compute the offset value in pixel
            //then invert this value and get the offset in milliseconds!
            var delta = scale.invert(scale.range()[0]+padding[_computeRectSize()]/1.2) - scale.invert(scale.range()[0]);
            scale.domain([d3.timeMillisecond.offset(old[0],-delta*factor), d3.timeMillisecond.offset(old[1],+delta*factor)]);
        }
        //update domains and ranges for all 4 scales
        if (_options.timeToX){
            _setTimePadding(_scale.temporal.focus.domain(extent).range(_xRange)); //update focus scale
            _scale.temporal.context.domain(_scale.temporal.focus.domain()).range(_scale.temporal.focus.range()); //context scale
            _scale.linear.focus.domain(_yRange).range([_yRange[1], _yRange[0]]); // linear scale is (almost) identity func
            _scale.linear.context.domain(_yRange).range([_yRange[1], _yRange[0]]);
            //update axes
            _graph.select('.x.axis').call(d3.axisBottom(_scale.temporal.focus));
            _graph.select('.y.axis').call(d3.axisRight(_scale.linear.focus));
            _xSubgraph.select('.x.axis').call(d3.axisBottom(_scale.temporal.context));
            _ySubgraph.select('.y.axis').call(d3.axisRight(_scale.linear.context));
        } else {
            //analogous to above
            _setTimePadding(_scale.temporal.focus.domain(extent.reverse()).range(_yRange));
            _scale.temporal.context.domain(_scale.temporal.focus.domain()).range(_scale.temporal.focus.range());
            _scale.linear.focus.domain(_xRange).range(_xRange);
            _scale.linear.context.domain(_xRange).range(_xRange);
            _graph.select('.x.axis').call(d3.axisBottom(_scale.linear.focus));
            _graph.select('.y.axis').call(d3.axisRight(_scale.temporal.focus));
            _xSubgraph.select('.x.axis').call(d3.axisBottom(_scale.linear.context));
            _ySubgraph.select('.y.axis').call(d3.axisRight(_scale.temporal.context));
        }
        //reset brush size:
        _xSubgraph.select('.brush').call(_xBrush.move,  _xRange);
        _ySubgraph.select('.brush').call(_yBrush.move,  [_yRange[1], _yRange[0]]);
    }

    function _setRectHelpers(){
        //This function enters/removes the small blue rectangles according to the current data array
        var xTransl = function (d) {
            if (_options.timeToX) return 'translate(' + (_scale.temporal.context(d.date) - 2.5) + ',0)';
            return  'translate(' + (_scale.linear.context(d.x) -2.5) + ',0)'
        };
        var yTransl = function (d) {
            if (!_options.timeToX) return  'translate(0,' + (_scale.temporal.context(d.date)-2.5) + ')';
            return  'translate(0,'+(_scale.linear.context(d.y)-2.5)+')'
        };
        innerUpdate(true); //first: update rectangles in the x subgraph
        innerUpdate(false); // then y subgraph
        function innerUpdate(xUpdate) {
            var smalls = (xUpdate ? _xSubgraph.select('#xSmalls') : _ySubgraph.select('#ySmalls'));
            var sel = smalls.selectAll('rect').data(_articleContainer.selectAll('g').data()); //data join
            //enter:
            sel.enter().append('rect').attr('class', 'article_small').attr('width',5).attr('height',5).merge(sel)
                .attr('transform', xUpdate ? xTransl : yTransl)
                .attr('initialTransform',  xUpdate ? xTransl : yTransl) //needed in _onArticleHover
                .on('mousemove', function(d){ _onArticleHover(d,false)})
                .on('mouseleave', function(d){ _onArticleHover(d, true)});
            sel.exit().remove();
        }
    }

    function _computeRectSize(){
        //SEMANTIC ZOOM
        //function for _options.article_mode in ['n', 's', 'm', 'l', 'auto'] -> ['n', 's', 'm', 'l']
        if (_options.article_mode === 'auto'){
            /*
             Semantic zooming.
             Compute the ratio between current_xBrush_size and total_xBrush_size,
             in order to compute the logarithmic zoom level.
             */
            var timebrush = _options.timeToX ? 'x' : 'y';
            var selected = d3.select('.'+timebrush+'.brush').select('.selection').attr(_options.timeToX ? 'width' : 'height');

            var total = _options.timeToX ? _xRange[1] : _yRange[0];
            // Math.abs is needed for the _yRange
            var zoomlevel = Math.floor(Math.log2(1/(Math.abs(selected)/total)));
            return ['n','s','m','l'][Math.min(zoomlevel,3)];
        }
        return _options.article_mode;
    }

    _constructor();
};