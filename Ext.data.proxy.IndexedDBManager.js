/**
 * Utility class to manage an indexed db.
 */
Ext.define('Ext.data.proxy.IndexedDBManager', {
    
    mixins: {
        observable: 'Ext.util.Observable'
    },
    
    singleton: true,
    
    /**
     * @private
     * db object
     */
    db: undefined,
    

    /**
     * @cfg {String} dbName
     * Name of database
     */
    dbName: undefined,
    
    /**
     * @private
     * is the database currently open
     */
    dbOpen: false,    

    /**
     * @cfg {String} version
     * database version. If different than current, use updatedb event to update database
     */
    dbVersion: '1.0',

    /**
     * @cfg {Array} objectStores
     * Object store definitions for database.  Each object store definition 
     * needs the following properties:  
     * @cfg {String} name
     * Name of the object store.  This is required.
     * @cfg {String} keyPath
     * Optional primary key for objectStore.
     * @cfg {Boolean} autoIncrement
     * Set true if keyPath is to autoIncrement. Defaults to IndexedDB default specification (false)
     * @cfg {Array} indexes
     * Array of Objects. Properties required are "name" for index name and "field" to specify index field
     * e.g. indexes: [{name: 'name', field: 'somefield', options: {unique: false}}]
     */
    objectStores: [],

    /**
     * @private
     * indexedDB object (if browser supports it)
     */
    indexedDB: window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB,

    /**
     * Creates the Indexed DB manager, throws an error if local storage is not 
     * supported in the current browser.
     */
    constructor: function() {
        if (!this.indexedDB) {
            Ext.Error.raise("IndexedDB is not supported in your browser.");
        }

        this.addEvents('dbopen', 'updatedb', 'noIdb');

         //<debug>
        //make sure that webkit references work
        if ('webkitIndexedDB' in window) {
          window.IDBTransaction = window.webkitIDBTransaction;
          window.IDBKeyRange = window.webkitIDBKeyRange;
        }
        //</debug>
        
        this.mixins.observable.constructor.apply(this, arguments);
    },

    /**
     * Opens the database and creates the object stores if necessary.
     * @param {Object} config (optional) Config object.
     */
    initializeDB: function(config) {        
        Ext.apply(this, config);
        
        if (config.listeners) {
            this.on(config.listeners);
        }
        
        if (!Ext.isString(config.dbName))  {
            Ext.Error.raise("The dbName string has not been defined in your configuration");
        }
		if (!Ext.isArray(config.objectStores) || Ext.isEmpty(config.objectStores)) {
            Ext.Error.raise("The objectStores array has not been defined in your configuration");
        }

        var me = this,
            request = me.indexedDB.open(me.dbName, me.dbVersion);        
        
        request.onupgradeneeded = function(e){            
            me.db = me.indexedDB.db = e.target.result;
            me.updateDBSchema.call(me, e.target.transaction);
        };        
        
        request.onsuccess = function(e) {
            var db = me.db = me.indexedDB.db = e.target.result;
            
            // We can only create Object stores in a setVersion transaction;
            
            
            if(me.dbVersion !== db.version && db.setVersion !== undefined) {
                //Handle Chrome 23 and older
                var setVrequest = db.setVersion(me.dbVersion);
                // onsuccess is the only place we can create Object Stores
                setVrequest.onfailure = me.onError;
                setVrequest.onsuccess = Ext.bind(me.updateDBSchema, me);
            }
                        
            me.dbOpen = true;
            me.fireEvent('dbopen', me, db);              
            
        };
        
        request.onfailure = me.onError;
    },
    
    /**
     * @private
     * Updates the database to the latest version.
     */
    updateDBSchema: function(transaction) {
        var me = this;
                
        if (transaction) {
            if (transaction instanceof Event) {
                me.upgradeTransaction = transaction.target.transaction;
            } else {
                me.upgradeTransaction = transaction;
            }
        }               
        Ext.each(me.objectStores, me.updateObjectStore, me);
        //Database is open and ready so fire updatedb event
        me.fireEvent('updatedb', me, me.db);
    },
    
    /**
     * @private
     * Creates or update the specified object store.
     */
    updateObjectStore: function(anObjectStore) {
        var me = this, db = me.db;
        if(db.objectStoreNames.contains(anObjectStore.name)) {            
            //Object store already exists
            if (!me.upgradeTransaction) {
                me.upgradeTransaction = db.transaction([anObjectStore.name], IDBTransaction.VERSION_CHANGE);
            }               
            objectStore = me.upgradeTransaction.objectStore(anObjectStore.name);
            
            if (anObjectStore.indexes && anObjectStore.indexes.length) {
                var currentIndex,
                    extraIndexes,
                    i,
                    storeIndexes = [];
                for (i=0; i < anObjectStore.indexes.length; i++) {
                    currentIndex = anObjectStore.indexes[i];
                    if (!objectStore.indexNames.contains(currentIndex.name)) {
                        objectStore.createIndex(currentIndex.name, currentIndex.field, currentIndex.options);
                    }
                    storeIndexes.push(currentIndex.name);
                }
                extraIndexes = Ext.Array.difference(objectStore.indexNames, storeIndexes);
                for (i=0; i < extraIndexes.length; i++) {
                    objectStore.deleteIndex(extraIndexes[i]);
                }
            } else if (objectStore.indexNames.length > 0) {
                for (i=0; i < objectStore.indexNames.length; i++) {
                    objectStore.deleteIndex(objectStore.indexNames.item(i));
                }
            }            
        } else {
            var options = {};
            if (anObjectStore.keyPath) {
               options.keyPath = anObjectStore.keyPath;
            }
            if (anObjectStore.autoIncrement) {
                options.autoIncrement = anObjectStore.autoIncrement;
            }
            
            console.log("creating objectstore:"+anObjectStore.name);
            var objectStore = db.createObjectStore(anObjectStore.name, options);
            // set indexes
            Ext.each(anObjectStore.indexes, function(anIndex) {
                objectStore.createIndex(anIndex.name, anIndex.field, anIndex.options);
            });                
        }        
    },
    
    /**
     * @private
     * Universal error reporter for debugging purposes
	 * @param {Object} err Error object.
     */
    onError: function(err) {
        if (window.console) console.log(err);
    },    
	
    /**
     * Get the pointer to the open indexedDB.
     */
    getDB: function() {
        return this.db;
    },
    
    /**
     * Get the current version of the database.
     */
    getDBVersion: function() {
        return this.dbVersion;
    },
    
    /**
     * Determine if the database is currently open.
     */    
    isOpen: function() {
        return this.dbOpen;
    }
    
    

});