
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
           d3.selectAll(identifier).transition().duration(200).style("opacity", .9);
                d3.selectAll('#articletip').html(generalHelper.dateformat(d.date))
                    .style("left", window.pageXOffset + matrix.e + "px")
                    .style("top", window.pageYOffset + matrix.f-20 + "px");

        };

        public.closeTooltip = function(identifier){
            d3.selectAll(identifier).transition().duration(200).style("opacity", 0);
        };

        public.onArticleClick = function(d){
            var article = _options.dataAccessor().getFromCache(d.id);
            var focusleft = $('#focusbox-left').data('public');
            focusleft.setMainArticle(article);
            var filtered = $('#segdummy').data('public').getFiltered();

            //now select and aggregate only segments which are also given in the left document.
            //we want to hide each segment in the right focusbox, which has not any of the classes e.type+e.id
            var notobj = {};
            var all = filtered.all.filter(function(e){
                if (e.docID == d.id){
                    notobj[e.type + e.id] = true;
                    return true;
                }
                return false;
            });

            var aliasses = [];
            var seglookup = {};
            all.forEach(function(s){
                var objectkey = s['docLeftOffset'] + '-' + s['docRightOffset'] + '-'+  s['docnormal'].toString();
                if (!aliasses.hasOwnProperty(objectkey)) aliasses[objectkey] = [];
                aliasses[objectkey].push(s.type+''+s.id);
                seglookup[s.type+s.id] = s;
            });
            $('#focusbox-left').show();
            $('#focusbox-left').data('public').updateSVGHeight();
            var segs = {all:all, aliasses: aliasses,  seglookup:seglookup};
            focusleft.setSegments(segs);

            //hide all polygons which have not any of the relevant class names:
           d3.select('#focusbox-rightsvg').selectAll('polygon').each(function(){
               var classes = d3.select(this).attr('class').split(' ');
               var count = 0;
               classes.forEach(function(e){if (!notobj.hasOwnProperty(e)) count++;});
               if (count === classes.length) d3.select(this).classed('selectsegment', false);
           });

           //update connector:
            var connector;
            if ($('#connectordual').data('public')){
                connector = $('#connectordual').data('public');
            } else {
                connector = new Visconnector($('#canvas').data('public').getGlueDual(), '#connectordual');
            }
            connector.updateLinkData(segs);
            connector.updateFocus();
        };

        public.onArticleRightClick = function(d){
            //change main article
            var article = _options.dataAccessor().getFromCache(d.id);
            $.post("/processor/seg", {docs: _options.dataAccessor().getCache(), refid:d.id}, 'json').done(function(res) {
                d3.selectAll('polygon.ref').remove();
                $('#focusbox-right').data('public').setMainArticle(article);
                $('#segdummy').data('public').visUpdate(res.data.matches, d.id);
                //to be sure:
               $('#canvas').data('public').setForeignDimensions();
            });
        };

        public.getDefaultOptions = function(){
            //called in the vislayer constructor
            return {dataAccessor: _options.dataAccessor, //function, reference to data layer
                padding :{left: 30, right:60, top:10, bottom:0}, //visualisation padding
                article_width:{ m:180}, //standard width/height in px
                article_height:{m:65},
            };
        };

    public.blendOut = function(){
        //dim the light for 1:1 view
        var v = $('#canvas').data('public');
        $('#heuristicsDialog').modal('hide');
        v.getGlueDual().attr('display', 'block');
        d3.selectAll('.overlay').style('display', 'block').transition().duration(1000).attr('opacity', 0.95);
    };

    public.blendIn = function(){
        //analogous to the above
        $('#focusbox-left').fadeOut();
        $('polygon.ref').addClass('selectsegment'); //show all segments again
        d3.selectAll('polygon.doc').remove(); //to be sure
        var v = $('#canvas').data('public');
        v.getGlueDual().attr('display', 'none');
        d3.selectAll('.overlay').transition().duration(1000).attr('opacity', 0).on('end', function(){
            d3.select(this).style('display', 'none');
        });

    };

    public.underlineFeatures = function(segtext, seg){
        //Returns the segtext with all intersecting features in the `seg` object being underlined.
        var out = segtext;
        var intersections = seg.docIntersections;
        var indexshift =intersections[0].characterOffsetBegin; //subtract thos
        var underlineoffset = 0; //sequentially run through text and remember offset induced by <u></u>
        intersections.forEach(function(a){
            out =  out.slice(0, a.characterOffsetBegin-indexshift+ underlineoffset) + '<u>' + a.originalText + '</u>' + out.slice(a.characterOffsetEnd-indexshift + underlineoffset);
            underlineoffset += 7;
        });
        return out;
    };

    _constructor();
};