/**
 * Author: P. Meschenmoser
 * This class generates very basic svg entities and initiates scale/zoom/brush functions.
 * The references are returned to visualisation layer and re-assigned over there (c.f. _initGraphics()).
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
        o._xSubgraph = g.append('g').attr('opacity',0); //focus graph
        o._ySubgraph = g.append('g').attr('opacity',0);

        //define scales. Defining their domains follows when data is changed
        o._scale = {temporal:{}, linear:{}};
        o._scale.temporal.focus = d3.scaleTime(); //for main graph, depends on:
        o._scale.temporal.context = d3.scaleTime(); //focus graph
        o._scale.linear.focus = d3.scaleLinear().domain(o._yRange).range(o._yRange);
        o._scale.linear.context = d3.scaleLinear().domain(o._yRange).range(o._yRange);
        o._scale.edge = d3.scaleLinear();

        //append zoom listener to static rectangle behind article boxes
        o._zoom = d3.zoom().scaleExtent([1, 200]);
        o._graph.append('rect').attr('class', 'zoom').attr('opacity', 0);

        // add main graph axes
        o._graph.append('g').attr('class', 'x axis').attr('opacity',0);
        o._graph.append('g').attr('class', 'y axis').attr('opacity',0);

        //avoid that article boxes are visible when outside _scale.temporal.focus.range()
        o.clip = svg.append('defs').append('svg:clipPath').attr('id', 'clip').append('rect');
        o._linkContainer = o._graph.append('g').attr('clip-path', 'url(#clip)');
        o._articleContainer = o._graph.append('g').attr('clip-path', 'url(#clip)');

        //X Brush
        o._xSubgraph.append('g').attr('class', 'x axis').attr('opacity',0);
        o._brush = d3.brushX().extent([[0, 0], [o._xRange[1], 6]]);
        o._xSubgraph.append('g').attr('class', 'x brush').call(o._brush);
        o._xSubgraph.append('g').attr('id', 'xSmalls');

        //Y Brush
        o._ySubgraph.append('g').attr('class', 'y axis').attr('opacity',0);
        o._brush2 = d3.brushY().extent([[0, 0], [6,o._yRange[0]]]);
        o._ySubgraph.append('g').attr('class', 'y brush').call(o._brush2);
        o._ySubgraph.append('g').attr('id', 'ySmalls');

        return o;
    }
};