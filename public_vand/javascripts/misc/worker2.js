/*
    Author: P. Meschenmoser
    HTML5 Web worker to compute article positions with a d3 v4 Verlet force simulation.
    The worker gets requested from vislayer, _updateGraphics.
    Its response gets back to the vislayer, the callback is defined in the constructor.
 */

importScripts("http://d3js.org/d3.v4.js");
importScripts("../external/d3-bboxCollide.js");
    onmessage = function (m) {
        var options = m.data.options;
        /*
            It is required to redefine the time scale, as it is not possible to submit functions via web workers.
         */
        var scale = d3.scaleTime().domain(options.timeDomain).range(options.timeRange);

        /*
            Fix the date attributes.
            So that this dimension won't have an impact on force computations.
            This is done by adding the property d.f(x|y), see d3 docu.
         */
        var fixed = (options.timeToX) ? function(d){d.fx = scale(d.date)} : function(d){d.fy = scale(d.date)};
        m.data.nodes.forEach(fixed);

        /*
            This force simulation consists of 5 (resp. 6, with x) different forces, that (partly) work against each other.
         */
        var simulation = d3.forceSimulation(m.data.nodes)
            .alphaTarget(0.00001)
            //add link force. Links for 2 articles with a high similarity are stronger!
            .force("link", d3.forceLink(m.data.links).strength(function(d){
                return d.value}))
            //add rectangle force. the rectangle should repell from each other.
            //distanceMin is set to a 'rounded boundary value', i.e. I don't differ between options.width and options.height
            .force("charge", d3.forceManyBody().strength(-20000).distanceMin(options.width))
            //add center force
            .force("center", d3.forceCenter(options.xRange[1] / 2, options.yRange[0] / 2))
            //add forces for additional x/y translations, basically can be ignored ;)
            .force("x", d3.forceX().strength(0))
            .force("y", d3.forceY().strength(-2/1000000000))
            //try to avoid overlap by submitting the dimensions of article containers to d3-bboxCollide
            .force("collide", d3.bboxCollide(function () {
                    return [[-options.width/2, - options.height/2], //our bounding box!
                             [options.width/2, options.height/2]]
         }).strength(options.strength)).stop(); //apply overall simulation strength and don't let it start

        //iterate the simulation ticks:
        for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
            simulation.tick();
        }

        //the simulation has finished now.
        //but it is possible that there are nodes that would be positioned outside the canvas.
        // thus, setBoundingBox(X|Y) manipulates d.(x|y) in a way that everything will be visible.
        function setBoundingBoxY(d){
            //note, that the y-Scale is inverted in the end.
            //This is like a SVG/d3 convention and makes many things easier.
            //So, this Math.max(d.y,options.height/5) will be a small value if options.height/5 < d.y.
            //But, this value is used to describe the LOWER boundary of the canvas!

            d.y = Math.min(Math.max(d.y,options.height/5), options.yRange[0]-options.height/5);
        }

        function setBoundingBoxX(d){
            d.x = Math.min(Math.max(d.x,options.width/2), options.xRange[1]-options.width/2);
        }
        var func = (options.timeToX) ? setBoundingBoxY : setBoundingBoxX;
        m.data.nodes.forEach(func);

        //return to vislayer:
        self.postMessage({nodes: m.data.nodes, links: m.data.links});
    };
