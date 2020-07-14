/**
 * Author: P. Meschenmoser
 *
 * This class manages full-text views and their segment highlighting. The basic idea of the implementation:
 * Insert a html code with spans, which indicate boundary features of segments. Then, add an svg overlay illustrating
 * appropriate polygons.
 */
var Focusbox = function(container, key){
    var public = this;
    var _basetext;
    var _d;
    var _svg;
    var _wrapper;
    var _lastcontent;
    var _header;
    var _segscache;

    function _constructor(){
        _wrapper = d3.select(container+'svg');
        _svg = d3.select(container+'svg').append('svg').style('top', 0);
        $(container).data('public', public);
    }

    public.setMainArticle = function(d){
        _d = d;
        _basetext = d.content;
        $('#articleimg'+key).attr('src', d.image);
        _lastcontent = _basetext;
        _header = '['+_d.source+'] <b>'+_d.title+':</b> ';
        $(container+'text').html(_header+ _lastcontent);
        //new text length requires new svg height:
        public.updateSVGHeight();
    };

    public.updateSVGHeight = function(){
        //adapt svg overlay to height of (new) text content
        _svg.attr('height', $(container+'text')[0].scrollHeight);
    };

    public.setSegments = function(_segs){
        _segscache =_segs;
        //for a correct polygon position afterwards:
        $('#focusbox-righttext').scrollTop(0);
        $('#focusbox-lefttext').scrollTop(0);
        var html;
        var aliasses = _segs.aliasses;
        var seglookup = _segs.seglookup;
        if (_segs.all.length > 0) { //there are some segments
            html = _basetext;

            //identify boundary features and aliasses:
            var boundaryfeaturelookup = {};
            for (var a in aliasses){
                var seg = seglookup[aliasses[a][0]];
                var l = [seg[key+'LeftOffset'],seg[key+'RightOffset']] ;
                var text = [seg[key+'LeftText'],seg[key+'RightText']] ;
                for (var i=0; i< l.length; i++){ //i_max = 1
                    if (!boundaryfeaturelookup.hasOwnProperty(l[i])) boundaryfeaturelookup[l[i]] = {text: text[i], aliasses:[]};
                    boundaryfeaturelookup[l[i]].aliasses.push(aliasses[a][0])
                }
            };
            //sort boundary features
            var keys = Object.keys(boundaryfeaturelookup).sort(function(a,b){return parseInt(a) - parseInt(b);});

            //wrap a span around each boundary feature
            //for this, slice the html sequentially and apply an offset due to prior span insertions
            var shift = 0; //offset
            for (var i=0; i<keys.length; i++){
                var uniquealiasses = new Set(boundaryfeaturelookup[keys[i]].aliasses);
                var tmp = [...uniquealiasses].toString().replace(/,/g , " "); //alias classes
                var wrapperstart = '<span class="'+key+' '+tmp + ' feature">';
                var wrapperend = '</span>';
                html = html.slice(0, parseInt(keys[i])+shift); //content to the right
                html += wrapperstart + boundaryfeaturelookup[keys[i]].text + wrapperend; //actual span
                html += _basetext.slice(parseInt(keys[i])  + boundaryfeaturelookup[keys[i]].text.length); //remainder content
                shift += wrapperstart.length + wrapperend.length; //update offset due to inserted span
            }

            //set html to text container
            _lastcontent = html;
            $(container+'text').html(_header+ _lastcontent);
            $(container+'text').append(_wrapper.node());

            var rectdata = [];
            for (var a in aliasses){
                var featureclass =container+'text > .feature.'+aliasses[a][0];
                if ($(featureclass).length){
                    //for each alias:
                    //how many lines does an segment have?
                    //at first compute the vertical segment extent:
                    var lines = Math.abs($(featureclass).first().position().top - $(featureclass).last().position().top);
                    lines/=20; //20 is the line distance
                    lines++;

                    var points = [];
                    //define polygon points, relative to a g offset:
                    if (lines ===1){
                        points.push({x:$(featureclass).first().position().left, y:0}); //top,left
                        points.push({x:$(featureclass).last().position().left+$(featureclass).last().width(), y:0}); //top,right
                        points.push({x:$(featureclass).last().position().left+$(featureclass).last().width(), y:20}); //bottom,right
                        points.push({x:$(featureclass).first().position().left, y:20});//bottom,left
                    } else if (lines > 1){
                        //more complex polygons, add full-width block between starting and ending feature
                        points.push({x:$(featureclass).first().position().left, y:0}); //top,left
                        points.push({x:197, y:0}); //top,right_max
                        points.push({x:197, y:20*(lines-1)}); //bottom-20,right_max
                        points.push({x:$(featureclass).last().position().left + $(featureclass).last().width(), y:20*(lines-1)}); //bottom-20,left
                        points.push({x:$(featureclass).last().position().left + $(featureclass).last().width(), y:20*lines});//bottom,left
                        points.push({x:0,  y:20*lines});//bottom,left_min
                        points.push({x:0, y:20});
                        points.push({x:$(featureclass).first().position().left, y:20});
                    }

                    var o = {};
                    o.groupoffset = $(featureclass).first().position().top;
                    o.classes= aliasses[a];
                    o.info = seglookup[aliasses[a][0]];
                    o.points = points;
                    rectdata.push(o);
                }
            }
            //enter/update/remove polygons
            var gjoin = _svg.selectAll('polygon').data(rectdata); //data join
            gjoin.exit().remove(); //remove old links
            gjoin.enter().append('polygon')
                .attr('id', function(d){ return d.id})
                //only displayed, if it has the class .selectsegment. Used when toggling between 1:n and 1:1 view.
                .attr('display','none').attr('class', 'selectsegment')
                .style('fill', 'steelblue').style('stroke', 'black').style('stroke-width', 1)
                //control fill opacity by slider control
                .style('fill-opacity', 0.05 * parseFloat($('#sofvalue').text()) ).style('stroke-opacity', 0.1)
                .on('mouseenter', function(d){
                    var edgeclasses =  '';
                    d3.select(this).style('stroke-opacity', 1).style('stroke-width', 2).style('stroke','orange').raise();
                    d.classes.forEach(function(cl){edgeclasses+= '.glueedge.'+cl+', ';});
                    if ($('#focusbox-left').is(':visible')){ //we are in  1:1view
                        //decide on which side we want to highlight the 'other' segment
                        var tmp = d3.select(this).classed('ref') ? 'doc' : 'ref';
                        d3.select('polygon.'+tmp+'.'+d.classes[0]).style('stroke-opacity', 1).style('stroke-width', 2).style('stroke','orange').raise();
                        //and scroll the remaining focusbox
                        var other = (tmp === 'doc') ? 'left' : 'right';
                        $('#focusbox-'+other+'text').scrollTo($('polygon.'+tmp+'.'+d.classes[0]).first(),0, {offset:-$('#focusbox-righttext').height()/2+$('polygon.'+tmp+'.'+d.classes[0]).first()[0].getBBox().height/2});
                        $('#focusbox-'+other).data('public').underlineFeatures(d.classes[0]);
                    } else {
                        d3.select(this).style('stroke-opacity', 1).style('stroke-width', 2).style('stroke','orange').raise();
                        //highlight segments in multi-view
                      $('span.doc.'+d.classes[0]).addClass('hoversegment');
                      //and scroll parent
                      $('span.doc.'+d.classes[0]).each(function(){$(this).parent().scrollTo(this);});
                  }
                  //highlight all appropiate glueedges:
                    d3.selectAll(edgeclasses.slice(0,-2)).style('stroke-width', 2).style('stroke','steelblue').style('stroke-opacity', 1).raise();
                    public.underlineFeatures( d.classes[0]);
                })
                .on('mouseleave', function(d){
                    public.resetUnderlinings();
                    //unhighlight the hovered polygon
                    d3.select(this).style('stroke', 'black').style('stroke-width', 1).style('fill-opacity', 0.05).style('stroke-opacity', 0.1);

                if ($('#focusbox-left').is(':visible')){
                    //unhighlight segment in left/right focusbox again
                    var tmp = d3.select(this).classed('ref') ? 'doc' : 'ref';
                    d3.select('polygon.'+tmp+'.'+d.classes[0]).style('stroke', 'black').style('stroke-width', 1).style('fill-opacity', 0.05).style('stroke-opacity', 0.1);
                    var other = (tmp === 'doc') ? 'left' : 'right';
                    $('#focusbox-'+other).data('public').resetUnderlinings();
                } else {
                    //unhighlight articles in multi-view
                    $('span.doc.'+d.classes[0]).removeClass('hoversegment');
                }
                //unhighlight glue edge:
                var c =  '';
                d.classes.forEach(function(cl){c+= '.glueedge.'+cl+', ';});
                d3.selectAll(c.slice(0,-2)).each(function(){
                    if (d3.select(this).classed('estedge')){
                        d3.select(this).style('stroke','green').style('stroke-width',1).style('stroke-opacity', 0.8);
                    } else {
                        d3.select(this).style('stroke-width', 1).style('stroke', 'black').style('stroke-opacity', 0.1);
                    }
                });
            }).on('contextmenu', function(){
                d3.event.preventDefault();
                //bring clicked polygon to back
                d3.select(this).lower();

                //and fire a mouseleave event
                d3.select(this).node().dispatchEvent(new MouseEvent('mouseleave'));
            });

            //update classes:
            _svg.selectAll('polygon').attr('class', function(d){
                var addendum = (d3.select(this).classed('selectsegment')) ? ' selectsegment' : '';
                return key + ' seg ' + d.classes.toString().replace(/,/g , " ") + addendum;
            }).attr('transform', function(d){return 'translate(0,'+d.groupoffset +')'}) //set group offset
             .attr("points",function(d) { //and the actual points
                return d.points.map(function(e) {
                    return [e.x,e.y].join(",");
                }).join(" ");
            });

        } else { //no segments
            html = _basetext;
            _lastcontent = html;
            $(container+'text').html('['+_d.source+'] <b>'+_d.title+':</b> ' + _lastcontent);
            $(container+'text').append(_wrapper.node());
            _svg.selectAll('polygon').remove();
        }

    };

    public.underlineFeatures = function(id){
        public.resetUnderlinings();

        //identify html content between two boundary features
        var tmp = _lastcontent;
         var content =_lastcontent.substring(tmp.indexOf(id)+id.length, tmp.lastIndexOf(id));
         content = content.substring(content.indexOf('</span>')+7, content.lastIndexOf('<span'))
         var old =  content ;

         //and wrap an <u></u> around each intersecting feature
        _segscache.seglookup[id][key+'Intersections'].forEach(function(a){
          content=  content.replace(new RegExp(a.originalText, 'g'),'<u>'+a.originalText+'</u>');
        });
        $(container+'text').html(_header + tmp.replace(new RegExp(old), content));
        $(container+'text > .feature.'+id).first().wrapInner('<u></u>'); //wrap <u></u> around upper bounding feature
        $(container+'text > .feature.'+id).last().wrapInner('<u></u>'); //wrap <u></u> around lower bounding feature
        $(container+'text').append(_wrapper.node()); //add svg again
    };


    public.resetUnderlinings = function(){
        $(container+'text u').contents().unwrap();//<u>feature</u> -> feature
    };

    _constructor();
    return public;
};