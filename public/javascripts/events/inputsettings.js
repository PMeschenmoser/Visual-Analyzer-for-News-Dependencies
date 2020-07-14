/**
 * Author: P. Meschenmoser
 * This class handles events for data input belonging to UI elements in the accordion.
 * Currently, this is the handler 'Import Articles', but could extended!
 * Called in main.js
 */

var Inputsettings = function(container, e_handler){
    var public = this;
    /*
        --Now--
        container: '#container_data'
        e_handler: function, central error handler

     */
    function constructor(){
        initEvents();
        $(container).data('public', public);
    }

    function initEvents(){
        //open import dialog:
        $('#btn_showimport').on('click', function() {
            $('#dia_import').data('public').open();
        });
    }

    constructor();
};