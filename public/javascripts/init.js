/**
 * Author: P. Meschenmoser
 *
 * This class defines locations for javascripts. require.js is the only javascript referenced in our html, thus the first code
 * called + configured over here:
 */

requirejs.config({
    "baseUrl": "javascripts",
    "paths": { //scripts from CDNs
        "jquery": "//cdnjs.cloudflare.com/ajax/libs/jquery/3.1.1/jquery.min",
        "jquery-ui": "//code.jquery.com/ui/1.12.1/jquery-ui.min",
        "d3": "//d3js.org/d3.v4.min",
        "d3-bboxCollide": "./external/d3-bboxCollide", //not available at a CDN
        "datatables.net": "//cdn.datatables.net/1.10.12/js/jquery.dataTables.min", // this property needs to be named datatables.net
        "scrollbar" : "//cdnjs.cloudflare.com/ajax/libs/malihu-custom-scrollbar-plugin/3.1.5/jquery.mCustomScrollbar.min",
        "mousewheel" : "//cdnjs.cloudflare.com/ajax/libs/jquery-mousewheel/3.1.13/jquery.mousewheel.min"
    },
    "shim": { //define load dependencies for the paths above
        "jquery-ui" : {"deps":["jquery"]},
        "d3-bboxCollide": {"deps": ["d3"]},
        "scrollbar" : {"deps":["jquery", "mousewheel"]}
    }
});


requirejs(['d3'], function(d3) {
    window.d3 = d3; //needed to access d3 v4, when it was loaded
});
// Load main module to start the app
requirejs(["main"]); //javascripts/main.js
