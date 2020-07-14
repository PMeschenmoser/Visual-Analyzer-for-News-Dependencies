/**
 * Author: P. Meschenmoser
 *
 * In Visinit.run(container, _options) we simply append basic svg elements to the container.
 * Also initialisation of scales, brushes, zooming, etc. The handles to this elements are submitted
 * as return value and read + applied by Vislayer.initGraphics()
 */


var Visinit = function(){
    var public = this;

    public.run = function(container, _options){
        //container is currently #canvas, _options needed for _options.padding for now.
        var o = {}; //for output properties.
        //add two div's for tooltips:
        d3.select("body").append("div").attr("class", "tooltip").attr('id', 'edgetip');
        d3.select("body").append("div").attr("class", "tooltip").attr('id', 'articletip');
        //add fullsized svg and get it's dimensions
        var svg = d3.selectAll(container).append('svg').attr('width', '100%').attr('height', '100%');
        var dim = svg.node().getBoundingClientRect();

        o._xRange = [0, dim.width - _options.padding.left - _options.padding.right];
        o._yRange = [dim.height - _options.padding.top - _options.padding.bottom -45, 0];

        var g = svg.append('g').attr('transform', 'translate('+_options.padding.left+','+_options.padding.top+')');
        o._graph = g.append('g'); //main graph
        o._xSubgraph = g.append('g').attr('opacity',0);


        //define scales. Defining their domains follows when data is changed
        o._scale = {temporal:{}, linear:{}};
        o._scale.temporal.focus = d3.scaleTime(); //for main graph, depends on:
        o._scale.temporal.context = d3.scaleTime(); //focus graph
        o._scale.shadow = d3.scaleLog().range([1,3]);

        //append zoom listener to static rectangle behind article boxes
        o._zoom = d3.zoom().scaleExtent([1, 200]);
        o._graph.append('rect').attr('class', 'zoom').attr('opacity',0);


        // add main graph axes
        o._graph.append('g').attr('class', 'x axis').attr('opacity',0);

        o._gluemulti = svg.append('g');
        o._gluemulti.attr('transform', 'translate(' + (o._xRange[1]+30) + ',0)');
        o._gluemulti.append('rect').attr('fill', 'darksalmon').attr('width', 65).attr('height', o._yRange[0]);
        o._gluemulti.append('rect').attr('fill', 'white').attr('id', 'gluefocusmulti').attr('width', 65).attr('height', 10).attr('opacity', 0.8).attr('stroke', 'black');

        o._gluedual = svg.append('g').attr('display', 'none');
        o._gluedual.attr('transform', 'translate(' + (o._xRange[1]+30) + ',0)');
        o._gluedual.append('rect').attr('fill', 'darksalmon').attr('id', 'gluebg').attr('width', 65).attr('height', o._yRange[0]);
        o._gluedual.append('rect').attr('fill', 'white').attr('id', 'gluefocusleft').attr('width', 32).attr('height', 10).attr('opacity', 0.8).attr('stroke', 'black');
        o._gluedual.append('rect').attr('fill', 'white').attr('id', 'gluefocusright').attr('width', 32).attr('height', 10).attr('opacity', 0.8).attr('stroke', 'black').attr('transform', 'translate(32,0)')

        o._smallm = svg.append('g');
        o._smallm.attr('transform', 'translate(' + (o._xRange[1]+22) + ',0)');

        //avoid that article boxes are visible when outside _scale.temporal.focus.range()
        o.clip = svg.append('defs').append('svg:clipPath').attr('id', 'clip').append('rect');
        o._linkContainer = o._graph.append('g').attr('clip-path', 'url(#clip)');
        o._articleContainer = o._graph.append('g').attr('clip-path', 'url(#clip)');

        //X Brush
        o._xSubgraph.append('g').attr('class', 'x axis');
        o._brush = d3.brushX().extent([[0, 0], [o._xRange[1], 6]]);
        o._xSubgraph.append('g').attr('class', 'x brush').call(o._brush);
        o._xSubgraph.append('g').attr('id', 'xSmalls');
        o._graph.append('rect').attr('class', 'overlay').attr('opacity',0).style('display', 'none');

        return o;
    }
};