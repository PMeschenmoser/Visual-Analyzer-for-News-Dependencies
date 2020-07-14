requirejs.config({
    "baseUrl": "js/app",
    "paths": {
        "app" : "../app",
        "d3": "//d3js.org/d3.v4.min",
        "jquery": "//cdnjs.cloudflare.com/ajax/libs/jquery/3.1.1/jquery.min",
        "bootstrap": "//maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min",
        "jquery-ui": "//cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui",
        "datatables.net": "//cdn.datatables.net/1.10.12/js/jquery.dataTables.min",
        "scrollto": "//cdn.jsdelivr.net/npm/jquery.scrollto@2.1.2/jquery.scrollTo.min"
    },
    "shim": {
        "jquery-ui" : ["jquery", "bootstrap"],
        "bootstrap": ["jquery"],
        "scrollto": ["jquery"]
    }
});

requirejs(['d3'], function(d3) {
    window.d3 = d3; //needed to access d3 v4, when it was loaded
});

// Load the main app module to start the app
requirejs(["app/main"]);
