/**
 * Author: P. Meschenmoser
 * This class initiates the jQueryUI dialog and adds UI event handlers for importing articles.
 . Called in main.js
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
        btnEvents();
        $(container).data('public', public);
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
            $('#datalayer').data('public').importFromFilesystem(event.target.files); //submit FileList
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
                $('#datalayer').data('public').importFromServer(pairs);//next: afterImport() in datalayer
            } else { //empty selection
                e_handler.toBox("Please select some rows.")
            }
        });
    }

    public.getAliases = function(){
        //this function generates a map for translating the JSON keys, c.f. data layer
        var res = {};
        $('#aliases input').each(function(){res[$(this).attr('name')] = $(this).val()});
        console.log(res);
        return res;
    };

    constructor();
};