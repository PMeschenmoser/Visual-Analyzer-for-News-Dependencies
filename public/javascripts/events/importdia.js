/**
 * Author: P. Meschenmoser
 * This class initiates the jQueryUI dialog and adds UI event handlers for importing articles.
 * For consistency reason, it is also a wrapper for showing/hiding
 * the jQueryUI dialog. Called in main.js
 */
var Importdia = function(container,e_handler, afterImport){
    var public = this;
    /*
        --Now--
         container:#dia_import
         e_handler: central error handling function
         afterImport: function, that gets forwarded to initialise the data layer.

     */
    function constructor(){
        diaEvents();
        btnEvents();
        $(container).data('public', public);
    }

    function diaEvents() {
        //dia_import's specific behavior:
        // the most exciting thing here is the open-function, here we add a data layer (if required)!
        $('#dia_import').dialog('option', {
            modal: true,
            closeOnEscape: false,
            width: 821,
            height: 260,
            open: function (_, ui) {
                //Bind new datalayer object to first accordion header:
                if (!$('#header_data').data('public')) {
                    //hide close button (c.f. goo.gl/Op37go), avoids clicking around in the UI without having
                    //picked some articles.
                    $(".ui-dialog-titlebar-close", ui.dialog).hide();
                    new Datalayer('#header_data', {
                        errorHandler: e_handler, afterImport: function (links, wasServerImport) {
                            $(".ui-dialog-titlebar-close").show();
                                afterImport(links, wasServerImport); //the func from line 7!
                                /*
                                    links is defined iff docs were requested from server.
                                    i.e. links is returned with the same request
                                 */
                        }  //end afterImport function
                    }); //end options object + Datalayer)
                }
                //update server overview, everytime the dialog gets opened:
                $('#header_data').data('public').getServerOverview(function (rows) {
                    var tbl = $('#tbl_overviewserver').DataTable();
                    //empty table, add data, redraw table:
                    tbl.clear();
                    rows.forEach(function (row) {tbl.row.add(row)});
                    tbl.draw();
                });
            } // end open
        }).dialog('open');
    }

    function btnEvents(){
        $('#btn_settingsfs').button({icon: "ui-icon-gear"}); //set gear icon to import from filesystem button
        $('#btn_importfs').on('click', function(){
            // Click on 'Import from Filesystem' triggers hidden input element.
            // Implemented that way to freely vary button text + style.
            $('#in_importfs').trigger('click');
        });
        $('#btn_settingsfs').on('click', function(){ //open file system settings
            $('#settingsfs').slideToggle();
        });
        $('#in_filterserver').on('input', function(){ //filter data table, when you type:
            var dt = $('#tbl_overviewserver').dataTable();
            var query = $(this).val();
            dt.fnFilter(query); //custom search on datatable
        });
        $('#in_importfs').on('change', function(event){ // if there were file selected in the dialog:
            var o = $('#header_data').data('public');
            o.importFromFilesystem(event.target.files); //submit FileList
        });
        $('#tbl_overviewserver tbody').on('click', 'tr', function(){ //blue highlighting of table rows
            $(this).toggleClass('selected');
        });
        $('#btn_importserver').on('click', function(){ //apply server import:
            var selected = $('#tbl_overviewserver').DataTable().rows('.selected').data();
            var pairs = []; //[{section:...,subject},{...}] to identify + load relevant articles in backend
            for (var i=0; i<selected.length; i++){
                pairs.push({section: selected[i][0], topic: selected[i][1]})
            }
            if (pairs.length > 0){
                $('#header_data').data('public').importFromServer(pairs);//next: afterImport() in datalayer
            } else { //empty selection
                e_handler.toBox("Please select some rows.")
            }
        });
}
    public.open = function(){
        $(container).dialog('open');
    };

    public.close = function(){
        $(container).dialog('close');
    };

    public.getAliases = function(){
        //this function generates a map for translating the JSON keys, c.f. data layer
        var res = {};
        $('#aliases input').each(function(){res[$(this).attr('name')] = $(this).val()});
        return res;
    };

    constructor();
};