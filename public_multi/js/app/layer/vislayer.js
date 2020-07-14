/**
 * Author: P. Meschenmoser
 *
 * This layer is the central component for the 1:n comparison view.
 * It loads references to very basic components (e.g. scales, axes) from the helper/Visinit.js
 * Whenever new data/segments become available, public.update() resp. public.setSegments() is called.
 * This class includes handlers for brushing, zooming, resizing.
 */

var Vislayer = function(container, options){
    var public = this;
    var _options;// filled by the help of Vishelper.js class
    var _visHelper;
    var _mainarticle = 0;
    var _gluemulti, _gluedual; //glue regions
    var _smallmcontainer, _smallm; //container and js-wrapper for small multiples
    //assigned by the help of the Visinit class, in _initGraphics():
    var _scale = {temporal:{focus: function(){}, context: function(){}}, shadow: function(){}};
    var _graph, _xSubgraph; // the subgraph g's are for the context visualisations
    var _articleContainer, _linkContainer;  //handler to further <g>'s
    var _xBrush;
    var _zoom; //(func)
    var _xRange, _yRange; //(func)


    function _constructor(){
        //get default options from vishelper:
        _visHelper = new Vishelper({dataAccessor:options.dataAccessor});
        _options = _visHelper.getDefaultOptions();
        for (var key in options){
            if (options.hasOwnProperty(key) && _options.hasOwnProperty(key)) _options[key] = options[key];
        }

        _initGraphics(); //re-assign variables from Visinit.js
        _onResize(true); //complement these referenced elements wrt. the current canvas dimensions
        d3.select(window).on('resize', function(){_onResize(false)}); //resize handler
        $(container).data('public', public); //bind public functions to #canvas.
    }

    function _initGraphics(){
        //This functions re-assigns variables that are returned by Visinit.js
        var i = (new Visinit()).run(container, _options);
        _xRange = i._xRange; _yRange= i._yRange; _scale = i._scale;
        _graph = i._graph; _xSubgraph = i._xSubgraph; _gluedual = i._gluedual; _gluemulti = i._gluemulti; _smallmcontainer = i._smallm;
        _linkContainer = i._linkContainer; _articleContainer = i._articleContainer;
        _xBrush = i._brush;  _clip = i.clip; _zoom = i._zoom;
        //add brush and zoom handler:
        _xBrush.on('brush', function(){_onBrushEnd()});
        _zoom.on("zoom",  _onZoomEnd);
        _graph.selectAll('.overlay')
              .attr('width',_xRange[1])
              .attr('height', _yRange[0]-100)
              .on('click', function(){ _visHelper.blendIn();});
        //initiate wrapper for small multiples
        _smallm = new Smallm(_smallmcontainer);
    }

    function _onResize(firstResize){
        //firstResize (bool): first call is programmatically, not by an event. There, we don't want to wait 250ms.
        // for later resizing: As the event 'resize-end' is not available, we are using a work-around with timeouts
        // c.f. http://stackoverflow.com/questions/5489946/
        // jquery-how-to-wait-for-the-end-of-resize-event-and-only-then-perform-an-ac
        clearTimeout(window.resizedFinished);
        window.resizedFinished = setTimeout(function(){
            $('#focusbox-righttext, #focusbox-lefttext').scrollTop(0);
            var h = $('#focusbox-right').height();
            $('#canvas').height(h+65);


            var dim = d3.select(container).node().getBoundingClientRect();
            //new _xRange and _yRange:
            _xRange = [0, dim.width - _options.padding.left - _options.padding.right];
            _yRange = [dim.height - _options.padding.top - _options.padding.bottom -45, 0];
            _scale.temporal.focus = _scale.temporal.focus.range(_xRange);
            _scale.temporal.context = _scale.temporal.context.range(_xRange);
            //transform axes:
            _graph.select('.x.axis').attr('transform', 'translate(0,' + _yRange[0] + ')');
            //and context visualisations:
            _xSubgraph.attr('transform', 'translate(0,' + (_yRange[0]+20) + ')').attr('opacity', 1);
           // _xBrush.extent([[0, 0], [_xRange[1], 6]]);
           // _xSubgraph.call(_xBrush);
            d3.selectAll('.axis').attr('opacity',1); //for first resize
            //needed for brushing and zooming:
            _clip.attr('width',_xRange[1] ).attr('height', _yRange[0]);
            _zoom.translateExtent([[0, 0], [_xRange[1]+62, _yRange[0]+50]]);
            _graph.selectAll('.zoom').attr('width',_xRange[1] ).attr('height', _yRange[0]).call(_zoom);
            public.setForeignDimensions();
            _articleContainer.selectAll('.article').call(_transformArticles,false);
            _linkContainer.selectAll('.link').call(_transformLinks,false, false);
            _gluemulti.attr('transform', 'translate(' + (_xRange[1]+30) + ',0)');
            _gluedual.attr('transform', 'translate(' + (_xRange[1]+30) + ',0)');
            _gluemulti.select('rect').attr('height', _yRange[0]);
            _gluedual.select('rect').attr('height', _yRange[0]);
            _graph.select('.x.axis').call(d3.axisBottom(_scale.temporal.focus));
            _xSubgraph.select('.x.axis').call(d3.axisBottom(_scale.temporal.context));
            d3.select('.overlay').attr('height', _yRange[0]-100).attr('height', _xRange[1]);
            _smallmcontainer.attr('transform', 'translate(' + (_xRange[1]+22) + ',0)');
            _setRectHelpers();
            $('#connectormulti, #connectordual').data('public').updateFocus(); //update glue regions
            $('#connectormulti, #connectordual').data('public').transformLinks(false);
        }, firstResize ? 0 : 250);
    }

    function _updateArticleData(data){
        //data join:
        var join = _articleContainer.selectAll('g').data(data);

        //append new articles:
        var newArticles =  join.enter().append('g').attr('class','article')
            .attr('id', function(d){ return 'article'+d.id})
            .attr('transform', 'translate(0,0)') //initial translation
            .on('contextmenu', function(d){ //i.e. on right-click:
                if (d.id == _mainarticle) return; //nothing happens if right-click on main article
                d3.event.preventDefault(); // don't show context menu
                if (d3.event.ctrlKey || d3.event.altKey || d3.event.shiftKey || d3.event.metaKey){
                    d3.select(this).lower(); //bring article to back
                } else {
                    _visHelper.onArticleRightClick(d); //set the clicked article as main article
                }
            }).on('click', function(d){
                if (d.id != _mainarticle){
                    //show 1:1 view
                    _visHelper.onArticleClick(d);
                    _visHelper.blendOut();
                }
            }).on('mouseenter', function(d){
                //call _onArticleHover with the articles data and tell that the event was no mouseout
                _onArticleHover(d, false);
            }).on('mouseleave', function(d){ _onArticleHover(d, true)});//analogous

        //for each new article, append an svg:foreign objects, basic html
        newArticles.append('foreignObject').append("xhtml:body").html("<div class='article_container'><div class='article_wrapper'></div></div>");
        //and a small bobble: it helps at visually combining edge and node in case of more than 7 nodes:
        newArticles.append('rect').attr('fill', 'black').attr('width',4).attr('height',4);
        join.exit().remove(); //remove old articles
    }
    function _updateLinkData(data){
        var join_links = _linkContainer.selectAll('line').data(data); //data join
        join_links.exit().remove(); //remove old links
        join_links.enter().append('line') //enter new links
            .attr('class', 'link')
            .attr('id', function(d){ return 'link'+d.id})
    }

    function _updateSmallmData(data){
        //data is an object array, containing permutation matrices.
        var join_smallm = _smallmcontainer.selectAll('.smallm').data(data);
        join_smallm.exit().remove();
        join_smallm.enter().append('g')
            .attr('class', 'smallm')
            .attr('id', function(d,i){return 'smallm'+i});
        _smallm.updateData();
    }

    function _transformLinks(selection, withTransition, updateConnector){
        //call analogous to _transformArticles
        var transition = (withTransition) ? selection.transition().duration(500) : selection;
            transition.attr('x1', function(d){
                return _scale.temporal.focus(d.date)})
                .attr('y1', function(d,i){
                    var offset = Math.floor(i/7)*20; //make this whole thing scalable, for more than 7 nodes
                    offset *=  (Math.floor(i/7) % 2 == 0) ? 1 :-1; //avoid edge crossings
                    var height =d3.select('#article'+i).node().getBBox().height;
                    var translate = _visHelper.getTransformation(d3.select('#article'+i).attr('transform')).translateY;
                    var y1 = translate + height/2+offset;
                    //move small multiples:
                    d3.select('#smallm'+i).attr('transform', 'translate(5,'+ (y1+10)+')');
                    return y1;
                    })
                .attr('x2', function(){return _xRange[1]})
                .attr('y2', function(d,i){
                    var offset = Math.floor(i/7)*20; //make this whole thing scalable, for more than 7 nodes
                    offset *=  (Math.floor(i/7) % 2 == 0) ? 1 :-1; //avoid edge crossings
                    var height =d3.select('#article'+i).node().getBBox().height;
                    var translate = _visHelper.getTransformation(d3.select('#article'+i).attr('transform')).translateY;
                    return translate + height/2+offset;
                })
                .attr('opacity', function(d,i){
                    if (_scale.temporal.focus(d.date) + _options.article_width[_computeRectSize()]/2 <= 0 || i == _mainarticle){
                        return 0; //hide edge, when the article is partly out of the focus
                    }
                    return 1
                });

        if (updateConnector){
            $('#connector').data('public').transformLinks(false);
        }
    }

    function _setContent(){
        //Fills nodes with basic information with basic information wrt. source and title. Indicates missing data.
        _articleContainer.selectAll('foreignObject').attr('class',  'foreign_small');
        _articleContainer.selectAll('.article_wrapper').html(function(){
            var d = d3.select(this.parentNode.parentNode).datum();
            var content = '<i>'+_options.dataAccessor().getFromCache(d.id)['source'] + '</i></br><b>' +  _options.dataAccessor().getFromCache(d.id)['title']+ '</b>';
            return "<div class='article_text' style='float:left;text-align:justify'>" + ((content && content.length>0) ? content : "Missing Input Data") + "</div>";
        });
    }

    public.update = function(mainarticle){
        //set new main article
        if (typeof mainarticle !== 'undefined') _mainarticle = mainarticle;
        var d = _options.dataAccessor().getDateInfo();

        //further updates
        _updateLinkData(d.dates);
        _updateArticleData(d.dates);
        _setRectHelpers();
        _setContent();
       _updateScales(d.extent);
       //transform
        _articleContainer.selectAll('.article').call(_transformArticles,false);
        _linkContainer.selectAll('.link').call(_transformLinks,false, false);
        //zoom
        _zoom.translateExtent([[0, 0], [_xRange[1]+62, _yRange[0]+50]]);
        _graph.selectAll('.zoom').attr('width',_xRange[1] ).attr('height', _yRange[0]).call(_zoom);
        //small multiples
        _smallm.updateVis();
    };

    public.setSegments = function(s){
        var segs = s.all;
        var aliasses = s.aliasses;
        var seglookup = {};
        segs.forEach(function(s){seglookup[s.type+s.id] = s;});

        var matrices = [];
        var mainlength = _options.dataAccessor().getDocumentLength(_mainarticle);//needed for accumulated length ratio

        _articleContainer.selectAll('.article_wrapper').each(function(d,j){
            var d = d3.select(this.parentNode.parentNode).datum();
            var text = _options.dataAccessor().getFromCache(d.id)['content'];
            //upper html part: source and title
             var html = '<span class="article_text_wide"><i>'+_options.dataAccessor().getFromCache(d.id)['source'] + ':</i><b>' +  _options.dataAccessor().getFromCache(d.id)['title'].slice(0,50) +'</b></br>';
            var foreign = d3.select(this.parentNode.parentNode.parentNode);
            var containsmatches = false;

            var copylengths = {};
            var perm = [];
            for (var a in aliasses){
                var doclookup = [];
                //for each alias check, whether we have the current article included somewhere:
                for (var k= 0; k<aliasses[a].length; k++) doclookup.push(seglookup[aliasses[a][k]].docID);
                if (doclookup.indexOf(j)>-1){//article included
                    containsmatches = true;
                    var curr = seglookup[aliasses[a][0]];//segment wrt. first alias
                    var curr2 = seglookup[aliasses[a][doclookup.indexOf(j)]]; //this particular segment
                    var segtext = text.slice(curr2.docLeftOffset, curr2.docRightOffset + curr2.docRightText.length);
                    //for each segments, add a span with underlined features:
                    html += "[<span class='seg doc "+curr.type+" " +(curr.type+curr.id)+"'>" + _visHelper.underlineFeatures(segtext, curr2) + "</span>]</br>";

                    //compute accumulated length ratio:
                    //first, remember counterpart segment lengths in the main article
                    var copykey = curr.docLeftOffset+'-'+ segtext;
                    if (!copylengths.hasOwnProperty(copykey)){//completely new segment is visited
                        copylengths[copykey] = {sum:0, count:0};
                        perm.push(curr);
                    }
                    copylengths[copykey].sum += curr.refRightOffset + curr.refRightText.length -  curr.refLeftOffset;
                    copylengths[copykey].count++;
                }
            }
            var copyperc = 0;
            //average lengths:
            for (var c in copylengths){
                copyperc += copylengths[c].sum/copylengths[c].count; //first: avg for same segments on the left
            }
            copyperc /=  mainlength; //compute ratio
            copyperc = Math.min(1, copyperc); //to be sure

            //permutation lookup for left documents, i.e. sort by segment center:
            var permleft = perm.slice().sort(function(a,b){
                return (a.docLeftOffset+a.docRightOffset)/2 - (b.docLeftOffset+b.docRightOffset)/2
            });
            //and for main article:
            var permright = perm.slice().sort(function(a,b){
                return (a.refLeftOffset+a.refRightOffset)/2 - (b.refLeftOffset+b.refRightOffset)/2
            });
            var permmatrix = [0];
            permleft.forEach(function(p,i){ //actual detection of 'wrong segment positions'
                permmatrix.push((p.id === permright[i].id) ? 1 : 0);
            });
            matrices.push({matrix:permmatrix});
            if (containsmatches){
                //save accumulated length ratio as attribute and set compressed full-text as article content
                foreign.select('.article_container').attr('copyperc', copyperc);
                foreign.attr('class','foreign_wide');
                d3.select(this).html(html+"</span>");
            } else {
                foreign.select('.article_container').attr('copyperc', 0);
                foreign.attr('class','foreign_small');
            }

        });
        //postprocessing:
        public.setForeignDimensions();
        _updateSmallmData(matrices);
        _onResize(false);
        public.applyShadows();
        _fixScale();
    };

    function _fixScale(){
        //Checks, whether each article container is fully visible.
        var xmax = 0;
        _articleContainer.selectAll('.article').each(function(){
            var width = d3.select(this).node().getBBox().width;
            var xtranslate = _visHelper.getTransformation(d3.select(this).attr('transform')).translateX;
            if (xtranslate + width > xmax) xmax = xtranslate + width;
        });
        if (xmax<_xRange[1]){
            console.log("no need for scale fixing.")
        } else{
            // If not, calculate required deltax, and update time scale domain + translates
            console.log("apply scale fixing.");
            var delta = xmax - _xRange[1]+200;
            _updateScales(_scale.temporal.context.domain(), delta);
            _setRectHelpers();
            _articleContainer.selectAll('.article').call(_transformArticles,false);
            _linkContainer.selectAll('.link').call(_transformLinks,false, false);
        }
    }

    public.setForeignDimensions = function(){
        var h = 0.8*_yRange[0]/7; //article height for .foreign_wide. Factor 0.8 for some padding.
        //update positions for little edge blobs
        d3.selectAll('foreignObject').each(function(_,i){
            //avoid edge crossings
            var offset = Math.floor(i/7)*20; //make this whole thing scalable, for more than 7 nodes
            offset *=  (Math.floor(i/7) % 2 == 0) ? 1 :-1; //alternating direction,
            if (d3.select(this).classed('foreign_wide')){
                d3.select(this).style('width', '700px').style('height', h+'px !important')
                    .attr('width', '700px').attr('height', h+'px');
                d3.select(this).select('body').style('width', '700px').style('height', +h+'px');
                //update bobble
                d3.select(this.parentNode).select('rect').attr('transform', 'translate(700,'+(h/2-2+offset)+')')
            }
            if (d3.select(this).classed('foreign_small')){
                d3.select(this).style('width', '185px').style('height','65px !important')
                    .attr('width', '185px').attr('height', '65px');
                d3.select(this).select('body').style('width', '185px').style('height', '62px');
                //update bobble
                d3.select(this.parentNode).select('rect').attr('transform', 'translate(185,'+(29+offset+2)+')')
            }
        });
    };

    public.applyShadows = function(){
        //'fallback border:'
        d3.selectAll('.article_container').style('border', function(d,i){
            return '1px solid ' + ((i === _mainarticle) ? 'steelblue' : 'black');
        });

        //determine similarity domain:
        var mode = $('#borderEncoding option:selected').val();
        var domain;
        if (mode === 'tfidf'){
            console.log("border encoding option: tfidf.");
            //request domain from datalayer
            domain = _options.dataAccessor().getSimilarityDomain(_mainarticle);
        } else if (mode === 'acclen'){
            console.log("border encoding option: acclen.")
            var tmp = [];
            //request domain by checking and sorting 'copyperc' attribute
            d3.selectAll('.foreign_wide').each(function(){
                var that = this;
                tmp.push(parseFloat(d3.select(that).select('.article_container').attr('copyperc')));
            });
            tmp =tmp.sort();
            domain=[tmp[0], tmp[tmp.length-1]];
        } else {
            console.log("no valid border encoding option.")
            return;
        }

        // /apply to scale:
        _scale.shadow = _scale.shadow.domain(domain);
        _articleContainer.selectAll('.article').select('.article_container').style('border', function(d,i){
            if (i !== _mainarticle){
                var val;
                if (mode === 'tfidf') val = _scale.shadow(_options.dataAccessor().getSimilarity(_mainarticle,i));
                if (mode === 'acclen'){//i.e. else
                        val = _scale.shadow(parseFloat(d3.select(this).attr('copyperc')));
                }
                d3.select(this).attr('enc', val); //used for edge highlighting threshold
                return val+'px solid black';
            } else { //for main article
                d3.select(this).attr('enc', 1);
                return '1px solid steelblue';
            }
        });
        _articleContainer.selectAll('.article_container').style('box-shadow', '0px 3px 2px rgba(0,0,0,0.01)');
        $('#connectormulti').data('public').applyEdgeHighlighting();
    };

    function _updateScales(extent, extra){
        if (!extra) extra = 0;
        //This function updates all scales in _scale, but not _scale.edge. extent has the form [dateMin, dateMax]
        function _setTimePadding(scale){ //inner function, scale is a temporal scale
            //this function extends the current time domain, so that article are not cropped off at the boundaries
            //notice, that's a different thing than d3.scale.nice() would do!
            var old = scale.domain();
            var factor = 1;
            //first, compute the offset value in pixel
            //then invert this value and get the offset in milliseconds!
            var delta = scale.invert(scale.range()[0]+300+extra) - scale.invert(scale.range()[0]);
            scale.domain([old[0], d3.timeMillisecond.offset(old[1],+delta*factor)]);
        }

            _setTimePadding(_scale.temporal.focus.domain(extent).range(_xRange)); //update focus scale
            _scale.temporal.context.domain(_scale.temporal.focus.domain()).range(_scale.temporal.focus.range()); //context scale

            //update axes
            _graph.select('.x.axis').call(d3.axisBottom(_scale.temporal.focus));
            _xSubgraph.select('.x.axis').call(d3.axisBottom(_scale.temporal.context));

        //reset brush size:
        _xSubgraph.select('.brush').call(_xBrush.move,  _xRange);
    }

    function _computeRectSize(){
        return 'm';
    }

    function _onArticleHover(d, out){
        //d is a article's data object, out indicated mouseenter/mousemove or mouseleave
        var that = d.id;
        //(un)highlight the blue rectangles:
        _xSubgraph.selectAll('.article_small').call(highlightSmalls);
        //define tooltip function:
        var articlefunc;
        if (out) { //on mouseleave
            articlefunc = function(d){_visHelper.closeTooltip('#articletip',d )};
            $('#connectormulti').data('public').resetEdgeColors();
        } else { //on mouseenter/mousemove
            articlefunc = function(d){
                //c.f. _visHelper.showTooltip for further explanaton
                var matrix = this.getScreenCTM()
                    .translate(+this.getAttribute("cx"), +this.getAttribute("cy"));
                _visHelper.showTooltip('#articletip',d,matrix)
            }
            d3.selectAll('.glueedge'+that).style('stroke-width', 2).style('stroke','steelblue').style('stroke-opacity', 1).raise();

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
                    var initial = _visHelper.getTransformation(d3.select(this).attr('initialTransform'));
                    return 'translate('+(initial.translateX - shift ) + ',' + (initial.translateY-shift) +')';
                });
        }
    }

    function _onBrushEnd(){ //called after moving or resizing the brush handlers
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
        if (d3.event.selection && d3.event.sourceEvent){ //brush by a 'true' event
            var range =  d3.event.selection;
            _scale.temporal.focus.domain(range.map(_scale.temporal.context.invert, _scale.temporal.context));
            //synchronize zoom behavior to updated brush properties:
            var s =  _xRange[1]/(range[1] - range[0]); //zoom factor
            var t1 = -range[0]; //translate value for x
            var t2 = 0; //translate value for y
            _graph.select(".zoom").call(_zoom.transform, d3.zoomIdentity.scale(s).translate(t1, t2));
        } else {
            //for initialisation:
            _scale.temporal.focus.domain(_scale.temporal.context.range().map(_scale.temporal.context.invert, _scale.temporal.context));
        }
        _graph.select('.x.axis').call(d3.axisBottom(_scale.temporal.focus));
        _linkContainer.selectAll('.link').call(_transformLinks,false, false);
        _articleContainer.selectAll('.article').call(_transformArticles,false);
    }

    function _onZoomEnd(){
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return;
        var t = d3.event.transform;
        _scale.temporal.focus.domain(t.rescaleX(_scale.temporal.context).domain());
        _graph.select('.x.axis').call(d3.axisBottom(_scale.temporal.focus));
        var newFocus = _xRange.map(t.invertX, t);
        _xSubgraph.selectAll('.brush').call(_xBrush.move, [Math.max(0,newFocus[0]),Math.min(newFocus[1],_xRange[1])]);
        _linkContainer.selectAll('.link').call(_transformLinks,false, false);
        _articleContainer.selectAll('.article').call(_transformArticles,false);
    }

    function _transformArticles(selection, withTransition){
        var n= 7; //seven articles per y domain
        var dist = parseInt(_yRange[0]/n); //space assigned to each article
        var transition = (withTransition) ? selection.transition().duration(500) : selection;
            transition.attr('transform', function (d,i) { //translate
                return 'translate(' + (_scale.temporal.focus(d.date)) + ',' +((i % n) *dist)  + ')';
            });
    }

    function _setRectHelpers(){
        //This function enters/removes the small blue rectangles according to the current data array
        var xTransl = function (d) {
             return 'translate(' + (_scale.temporal.context(d.date) - 2.5) + ',0)';
        };
        innerUpdate();
        function innerUpdate() {
            var smalls = _xSubgraph.select('#xSmalls');
            var sel = smalls.selectAll('rect').data(_articleContainer.selectAll('g').data()); //data join
            //enter:
            sel.enter().append('rect').attr('class', 'article_small').attr('width',5).attr('height',5).merge(sel)
                .attr('transform', xTransl)
                .attr('initialTransform', xTransl )
                .on('mouseenter', function(d){ _onArticleHover(d,false)})
                .on('mouseleave', function(d){ _onArticleHover(d, true)});
            sel.exit().remove();
        }
    }


    public.getGlueMulti = function(){
        return _gluemulti;
    };

    public.getGlueDual = function(){
        return _gluedual;
    };

    _constructor();
};