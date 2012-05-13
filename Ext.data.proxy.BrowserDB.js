/**
 * @author Grgur Grisogono
 *
 * BrowserDB Proxy for Ext JS 4 uses best available browser (local) database to use for your locally stored data
 * Currently available: IndexedDB and WebSQL DB
 * 
 * Version: 0.3
 *
 */
(function() {
    
    var idb = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB,
        cfg = {};

    /**
     * Choose which proxy to extend based on available features. IndexedDB is preferred over Web SQL DB
     */
    if (!idb) {
        cfg.extend  = 'Ext.data.proxy.WebDB';
        cfg.dbInUse = 'webdb';
    } else {
        cfg.extend  = 'Ext.data.proxy.IndexedDB';
        cfg.dbInUse = 'idb';
    }

    Ext.define('Ext.data.proxy.BrowserDB', {
        extend              : cfg.extend,

        alias               : 'proxy.browserdb',

        alternateClassName  : 'Ext.data.proxy.BrowserCache',

        dbInUse             : cfg.dbInUse,

        /**
         * Route to the right proxy.
         * @param {Object} config (optional) Config object.
         */
        constructor: function(config) {
            // make sure config options are synced
            if (this.dbInUse !== 'idb') {
                config.dbTable = config.dbTable || config.objectStoreName;
            } else {
                config.objectStoreName = config.objectStoreName || config.dbTable;
            }
            this.callParent(arguments);
        }
    });

}());