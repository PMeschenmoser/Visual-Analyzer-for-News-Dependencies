/**
 * Author: P. Meschenmoser
 *
 * This class is used as a wrapper for managing the connecting region between the full-text and multiview, resp.
 * the other full-text at 1:1. 'glue' is a svg group and container is in ['#connectormulti', '#connectordual'].
 * Instantiated in the datalayer import callback or after article click, c.f. vishelper.onArticleClick();
 */
var Visconnector = function(glue, container){
    var public = this;
    var _links;
    var _segs;

    function constructor(){
        $(container).data('public', public);
        $('#focusbox-righttext, #focusbox-lefttext').scroll(function(){ //update our custom focus bar on scroll
            public.updateFocus();
        });
        _links = glue.append('g');
    }

    public.updateLinkData = function(segs){
        _segs = segs;
        var edgealiasses = {};
        segs.all.forEach(function(s){
            var key;
            //reduce number of edges
            if (container == '#connectordual') {
                //at 1:1 view, we have an 'alias' if two segment pairs encompass same regions in the full-texts.
                 key = s.docID + '-'+ s.docLeftOffset + '-' + s.docRightOffset + '-' + s.refLeftOffset + '-' + s.refRightOffset + '-' + s.mainnormal.toString();
            } else {
                //at 1:n view, we have an 'alias' if we have multiple segments from one reference article,
                // referencing the same segment region in the full-text
                 key = s.docID + '-'+ s.refLeftOffset + '-' + s.refRightOffset + '-'+  s.mainnormal.toString();
            }
            if (!edgealiasses.hasOwnProperty(key)) edgealiasses[key] = [];
            edgealiasses[key].push(s.type+s.id);
         });
        //actual data objects:
        var links = [];
        for (var a in edgealiasses){
            links.push({firstclass: edgealiasses[a][0], docID: segs.seglookup[edgealiasses[a][0]].docID, refID: segs.seglookup[edgealiasses[a][0]].refID, classes:edgealiasses[a]});
        }

        var join = _links.selectAll('.glueedge').data(links); //data join
        join.exit().remove(); //remove old links
        join.enter().append('line').attr('class', 'glueedge').attr('x1', 0)//enter new links
            .attr('x2', 65).on('mouseenter', function (d) {
                $('#focusbox-righttext').scrollTo($('polygon.ref.'+d.firstclass).first(),0, {offset:-$('#focusbox-righttext').height()/2+20});
                d3.selectAll('polygon.ref.'+d.firstclass).node().dispatchEvent(new MouseEvent('mouseenter'));
            }).on('mouseleave', function(d){
                d3.selectAll('polygon.ref.'+d.firstclass).node().dispatchEvent(new MouseEvent('mouseleave'));
            });

        _links.selectAll('.glueedge').attr('class', function(d){ //update classes
            return 'glueedge glueedge'+d.docID + ' '+ d.classes.toString().replace(/,/g , " ");
        });

        public.transformLinks();
    };

    public.updateFocus= function(){
        //Sets position and height for our custom scroll/focus bar.
        // Called whenever full-text is scrolled or new content is set.
        var h = $('#focusbox-righttext').height(); //same text height for both containers
        var glueheight = parseFloat(d3.select('#gluebg').attr('height'));
        //start with the right main text:
        var scrollh = $('#focusbox-righttext')[0].scrollHeight;
        d3.selectAll('#gluefocusmulti, #gluefocusright').attr('height', glueheight * (h/scrollh))
                                    .attr('transform', function(){
                                        var y = glueheight * (($('#focusbox-righttext').scrollTop())/scrollh);
                                        var x = (d3.select(this).attr('id') === 'gluefocusmulti')? 0 : 32;
                                        return 'translate('+x+',' + y + ')';
                                    });
        //and compute scrollbar height and translate for the left component in dual view:
        var scrollh2 = $('#focusbox-lefttext')[0].scrollHeight;
        d3.select('#gluefocusleft').attr('height',  glueheight * (h/scrollh2))
            .attr('transform', function(){
                var y = glueheight * (($('#focusbox-lefttext').scrollTop())/scrollh2);
                return 'translate(0,' + y + ')';
            });
    };

    public.transformLinks= function(){
        _links.selectAll('.glueedge')
            .attr('y1', function(d){
                if (container == '#connectordual'){//1:1 view
                    //i.e. get y1 coordinates by looking at full-text segments
                    var h = parseFloat(d3.select('#gluebg').attr('height'));
                    var classes = '';
                    d.classes.forEach(function(c){classes+= '.seg.doc.'+c+', '})
                    var y= h * ($('polygon.seg.doc.'+d.firstclass).first().position().top/$('#focusbox-lefttext')[0].scrollHeight);
                    return Math.min(y, h);
                } else { //1:n view
                    //derive y from edge y
                    var y = parseFloat(d3.select('#link' + d.docID).attr('y2'))-15; //position zero in a document
                    var relevantseg = _segs.seglookup[d.firstclass];
                    //compute relative position in document:
                    //first, take absolute segment center:
                    var perc = (relevantseg.docLeftOffset + relevantseg.docRightOffset)/2;
                    //and divide by the text length
                    perc/= $('#datalayer').data('public').getDocumentLength(relevantseg.docID);
                    //accordingly scale the 50 below, with [0,1]:
                    return y+50*perc; //for position indicator
                }
            }).style('stroke', function(){
                if (d3.select(this).classed('estedge')){
                    return 'green';
                }  else {
                    return 'black'
                }
            })
            .attr('y2', function(d){
                return parseFloat(d3.select('#gluebg').attr('height')) * ($('.ref.seg.'+d.firstclass).first().position().top/$('#focusbox-righttext')[0].scrollHeight);
            }).style('stroke-opacity',function(d){
                if (container == '#connectormulti' && parseFloat(d3.select('#link' + d.docID).attr('opacity')) == 0.0) return 0.0;
                var tmp = (container == '#connectordual') ? 1 : 2 ;
                var y  =  d3.select(this).attr('y' + tmp );
                return 0.1;
            });
    };

    public.applyEdgeHighlighting = function(){
        //Here, all edges are highlighted whose reference articles have a metric value
        // above a threshold (c.f. cosine sim, accumulated length ratio).
        var threshold = parseFloat($('#estvalue').text());
        _links.selectAll('.glueedge').classed('estedge', function(d){
            var container = $('span.seg.doc.'+d.firstclass).first().closest('.article_container');
            if ($(container).length){
                var val = (parseFloat($(container).attr('enc'))-1)/2;
                d3.select(this).raise(); //bring to front;
                if (val >= threshold){ //apply highlighting
                    d3.select(this).style('stroke','green').style('stroke-width',1).style('stroke-opacity', 0.8);
                } else {//unhighlight
                    d3.select(this).style('stroke-width', 1).style('stroke', 'black').style('stroke-opacity', 0.1);
                }
                return val >= threshold
            }
            return false;
        });
    };

    public.resetEdgeColors = function(){
        //Called to reset edges to their base colors, i.e. after some hovering effects.
        console.log("reset edge colors");
        _links.selectAll('.glueedge').each(function(){
            if (d3.select(this).classed('estedge')){
                //keep the edge green, if it is highlighted due to a metric value above threshold
                d3.select(this).style('stroke','green').style('stroke-width',1).style('stroke-opacity', 0.8);
            } else {//standard black edge
                d3.select(this).style('stroke-width', 1).style('stroke', 'black').style('stroke-opacity', 0.1);
            }
        });
    };

   constructor();
   return public;
};