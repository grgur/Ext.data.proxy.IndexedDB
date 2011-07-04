/**
 * @author Grgur Grisogono
 *
 * BrowserDB Proxy for Ext JS 4 uses best available browser (local) database to use for your locally stored data
 * Currently available: IndexedDB and WebDB
 * 
 * Version: 0.2
 *
 */
(function() {
    var idb = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB,
        cfg = {};

    if (!idb) {
        cfg.extend = 'Ext.data.proxy.WebDB';
        cfg.dbInUse = 'webdb';
    } else {
        cfg.extend = 'Ext.data.proxy.IndexedDB';
        cfg.dbInUse = 'idb';
    }

    Ext.define('Ext.data.proxy.BrowserDB', {
        extend: cfg.extend,
        alias : 'proxy.browserdb',
        alternateClassName: 'Ext.data.proxy.BrowserCache',

        dbInUse: cfg.dbInUse,

        /**
         * Creates the proxy, throws an error if local storage is not supported in the current browser.
         * @param {Object} config (optional) Config object.
         */
        constructor: function(config) {
            if (this.dbInUse !== 'idb') {
                config.dbTable = config.dbTable || config.objectStoreName;
            } else {
                config.objectStoreName = config.objectStoreName || config.dbTable;
            }
            this.callParent(arguments);
        }
    });

})();