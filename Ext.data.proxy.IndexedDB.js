/**
 * @author Grgur Grisogono, John Kleinschmidt
 *
 * IndexedDB proxy connects models and stores to local IndexedDB storage. 
 *
 * IndexedDB is natively available in IE 10+, Firefox 4+, Chrome 10+, Opera 15+ Blackberry 10.0+.
 * IndexedDB can also be polyfilled for other browsers via: https://github.com/axemclion/IndexedDBShim
 * 
 * Version: 0.7
 *
 */
Ext.define('Ext.data.proxy.IndexedDB', {
    extend              : 'Ext.data.proxy.Proxy',
    
    requires:             ['Ext.data.proxy.IndexedDBManager'],

    alias               : 'proxy.idb',

    alternateClassName  : 'Ext.data.IdbProxy',

    /**
     * @cfg {String} version
     * database version. If different than current, use updatedb event to update database
     */
    dbVersion           : '1.0',

    /**
     * @cfg {String} dbName
     * Name of database
     */
    dbName              : undefined,

    /**
     * @cfg {String} objectStoreName
     * Name of object store
     */
    objectStoreName     : undefined,

    /**
     * @cfg {String} keyPath
     * Primary key for objectStore. Proxy will use reader's idProperty if not keyPath not defined. 
     */
    keyPath             : undefined,
    
    /**
     * @cfg {Boolean} autoIncrement
     * Set true if keyPath is to autoIncrement. Defaults to IndexedDB default specification (false)
     */
    autoIncrement       : true,
    
    /**
     * @cfg {Array} indexes
     * Array of Objects. Properties required are "name" for index name and "field" to specify index field
     * e.g. indexes: [{name: 'name', field: 'somefield', options: {unique: false}}]
     */
    indexes             : [],

    /**
     * @private
     * indexedDB object (if browser supports it)
     */
    indexedDB           : window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB,

    /**
     * @private
     * db object
     */
    db                  : undefined,
        
    /**
     * Creates the proxy, throws an error if local storage is not supported in the current browser.
     * @param {Object} config (optional) Config object.
     */
    constructor: function(config) {
        this.callParent(arguments);
        
        this.checkDependencies();

        this.addEvents('dbopen', 'exception', 'cleardb', 'noIdb');

        //<debug>
        //fix old webkit references
        if ('webkitIndexedDB' in window) {
          window.IDBTransaction = window.webkitIDBTransaction;
          window.IDBKeyRange = window.webkitIDBKeyRange;
        }
        //</debug>

        this.transTypes = {};
        if (IDBTransaction.READ_WRITE) {
            this.transTypes['rw'] = IDBTransaction.READ_WRITE;
            this.transTypes['r'] = IDBTransaction.READ_ONLY;
        } else {
            this.transTypes['rw'] = 'readwrite';
            this.transTypes['r'] = 'readonly';
        }

        this.initialize();
    },

    /**
     * @private
     * Sets up the Proxy by opening database and creatinbg object store if necessary
     */
    initialize: function() {
        if (!this.keyPath) {
            this.keyPath = this.getReader().getIdProperty();
        }        
        if (Ext.data.proxy.IndexedDBManager.isOpen()) {       
            this.db = Ext.data.proxy.IndexedDBManager.getDB();
            this.fireEvent('dbopen', this, this.db);            
        } else {
            if (!Ext.isString(this.dbName)) {
                Ext.Error.raise("The dbName string has not been defined in your Ext.data.proxy.IndexedDB");
            }
            Ext.data.proxy.IndexedDBManager.initializeDB({
                dbName: this.dbName,
                defaultKeyPath: 'id',
                dbVersion: this.dbVersion,
                objectStores: [{
                    name: this.objectStoreName,
                    keyPath: this.keyPath,
                    indexes: this.indexes
                }],
                listeners: {
                    dbopen: function() {
                        this.db = Ext.data.proxy.IndexedDBManager.getDB();
                        this.fireEvent('dbopen', this, this.db);            
                    },
                    scope: this
                }
            });            
        }
    },
    	
	/**
     * Universal error reporter for debugging purposes
	 * @param {Object} err Error object.
     */
    onError: function(err) {
        if (window.console) console.log(err);
    },

	/**
     * Check if all needed config options are set
     */
	checkDependencies: function(){
		var me = this;
        if (!me.indexedDB) {
            me.fireEvent('noIdb');
            Ext.Error.raise("IndexedDB is not supported in your browser.");
        }		
		if (!Ext.isString(me.objectStoreName)) Ext.Error.raise("The objectStoreName string has not been defined in your Ext.data.proxy.IndexedDB");

		return true;
	},

    //inherit docs
    create: function(operation, callback, scope) {
        var records = operation.records,
            length  = records.length,
            id, record, i;

        operation.setStarted();

        for (i = 0; i < length; i++) {
            record = records[i];
            this.setRecord(record);
        }

        operation.commitRecords(records);
        operation.setCompleted();
        operation.setSuccessful();

        if (typeof callback == 'function') {
            callback.call(scope || this, operation);
        }
    },

    //inherit docs
    read: function(operation, callback, scope) {
        var me      = this;

        var finishReading = function(record, request, event) {
            me.readCallback(operation,record);

            if (typeof callback == 'function') {
                callback.call(scope || this, operation);
            }
        };

        //read a single record
        if (operation.id) {
            this.getRecord(operation.id,finishReading,me);
        } else {
            this.getAllRecords(finishReading,me,operation);
            operation.setSuccessful();
        }
    },

	/**
     * Injects data in operation instance
     */
    readCallback: function(operation, records) {
        var rec = Ext.isArray(records)?records:[records];
        operation.setSuccessful();
        operation.setCompleted();
        operation.resultSet = Ext.create('Ext.data.ResultSet', {
            records: rec,
            total  : rec.length,
            loaded : true
        });
    },

    //inherit docs
    update: function(operation, callback, scope) {
        var records = operation.records,
            length  = records.length,
            record, id, i;

        operation.setStarted();

        for (i = 0; i < length; i++) {
            record = records[i];
            this.updateRecord(record);
        }
        operation.commitRecords(records);
        operation.setCompleted();
        operation.setSuccessful();

        if (typeof callback == 'function') {
            callback.call(scope || this, operation);
        }
    },

    //inherit
    destroy: function(operation, callback, scope) {
        var records = operation.records,
            length  = records.length,
            i;

        for (i = 0; i < length; i++) {
            this.removeRecord(records[i], false);
        }
        
        operation.setCompleted();
        operation.setSuccessful();

        if (typeof callback == 'function') {
            callback.call(scope || this, operation);
        }
    },

	/**
     * Create objectStore instance
	 * @param {String} type Transaction type (r, rw)
	 * @param {Function} callback Callback function
	 * @param {Object} scope Callback fn scope
	 * @return {Object} IDB objectStore instance
     */
    getObjectStore: function(type, callback, scope) {
        var objectStore;
        try {
            var me = this,
                transaction = me.db.transaction([me.objectStoreName], type ? me.transTypes[type] : undefined);
                objectStore = transaction.objectStore(me.objectStoreName);
				this.retryCount = 0;
        } catch(e) {
            if (!this.retryCount || this.retryCount < 100) {
                if (!this.retryCount) {
                    this.retryCount = 1;
                } else {
                    this.retryCount++;
                }
                //retry until available due to asynchronous nature of indexedDB transaction. Not the best of workaraunds.
                Ext.defer(callback, 20, scope || me, [type, callback, scope]);
            } else {
                throw(e);
            }
            return false;
            //callback.call(scope || me, type, callback, scope);
        }

        return objectStore;
    },

    /**
     * @private
     * Fetches a single record by id.
     * @param {Mixed} id Record id
     * @param {Function} callback Callback function
	 * @param {Object} scope Callback fn scope
     */
    getRecord: function(id, callback, scope) {
        var me = this,
            objectStore = me.getObjectStore('r',Ext.bind(me.getRecord, me, [id, callback, scope])),
            Model = this.model,
            record;

        if (!objectStore) return false;

        var request = objectStore.get(id);

        request.onerror = function(event) {
            me.fireEvent('exception',me, event);
        };

        request.onsuccess = function(event) {
            record = new Model(request.result, id);
            if (typeof callback == 'function') {
                callback.call(scope || me, record, request, event);
            }
        };

        return true;
    },

	/**
     * @private
     * Fetches all records
     * @param {Function} callback Callback function
	 * @param {Object} scope Callback fn scope
     */
    getAllRecords: function(callback, scope, operation) {
        var currentPosition = -1,
            me = this,
            objectStore = me.getObjectStore('r',Ext.bind(me.getAllRecords, me, [callback, scope, operation])),
            Model = this.model,
            indexedSearch = false,
            params = operation.params || {},
            records = [],
            request;
        
        if (!objectStore) return;
        
        if (params.index) {
            var index = objectStore.index(params.index),
                indexParams = params,
                keyRange = null;
            if (indexParams.indexValue) {
                keyRange = IDBKeyRange.only(indexParams.indexValue);
            } else if (indexParams.indexLower || indexParams.indexUpper) {
                if (indexParams.indexLower) {
                    if (indexParams.indexUpper) {
                        keyRange = IDBKeyRange.bound(indexParams.indexLower, indexParams.indexUpper);
                    } else {
                        keyRange = IDBKeyRange.lowerBound(indexParams.indexLower);
                    }
                } else if (indexParams.indexUpper) {
                    keyRange = IDBKeyRange.upperBound(indexParams.indexUpper);
                }
            }
            request = index.openCursor(keyRange);
            indexedSearch = true;
        } else if (operation.start != null && operation.start == -1) {
            request = objectStore.openCursor(null, 'prev');
        } else{
            request = objectStore.openCursor();
        }

        request.onerror = function(event) {
            me.fireEvent('exception',me, event);
        };

        request.onsuccess = function(event) {
            var cursor = event.target.result,
                performCallback = false;
            if (cursor) {
                currentPosition++;
                if (operation.start !== null && operation.start > currentPosition) {                    
                    cursor["continue"]();
                } else {                
                    if (indexedSearch || params.containsSearch) {
                        if (!params.containsSearch || me.isContainsMatch(cursor,params.containsSearch, params.containsKeys)) {
                            records.push(new Model(cursor.value, cursor.value[me.keyPath]));
                        }
                    } else {
                        records.push(new Model(cursor.value, cursor.key));
                    }                
                    if (operation.limit && records.length >= operation.limit) {
                        performCallback = true;
                    } else {                    
                        cursor["continue"]();
                    }
                }
            } else {
                performCallback = true;
            }
            if (performCallback  && typeof callback == 'function') {
                callback.call(scope || me, records, request, event);
            }
        };
    },
    
    isContainsMatch: function(cursor, containsValue, containsKeys) {
        if (cursor.key.toLowerCase().indexOf(containsValue) > -1) {
            return true;
        }
        if (containsKeys) {
            for (var i=0;i<containsKeys.length; i++) {
                if (cursor.value[containsKeys[i]].toLowerCase().indexOf(containsValue) > -1) {
                    return true;
                }
            }
        }
        return false;
    },

    /**
     * Saves the given record in the Proxy.
     * @param {Ext.data.Model} record The model instance
     */
    setRecord: function(record) {
        var me = this,
            rawData = record.data,
            id = record[me.keyPath],
            objectStore = me.getObjectStore('rw',Ext.bind(me.setRecord, me, [record]));

        if (!objectStore) return;

        var request = objectStore.add(rawData);
        
        request.onerror = function(event) {
            me.fireEvent('exception',me, event);
        };                
    },

	/**
     * Updates the given record.
     * @param {Ext.data.Model} record The model instance
     */
    updateRecord: function(record) {
        var me = this,
            objectStore = me.getObjectStore('rw',Ext.bind(me.updateRecord, me, [record])),
            id = record.get(me.keyPath),
            newData = record.data;            

        if (!objectStore) return false;

        var keyRange = IDBKeyRange.only(id),
            cursorRequest = objectStore.openCursor(keyRange);

        cursorRequest.onsuccess = function(e) {
            var result = e.target.result;
            if(!!!result) {                
                return me.setRecord(record);
            } 
            result.update(newData);
          };

        cursorRequest.onerror = function(event) {
            me.fireEvent('exception',me, event);
        };

        return true;
    },

    /**
     * @private
     * Physically removes a given record from the object store. 
     * @param {Mixed} id The id of the record to remove
     */
    removeRecord: function(record) {
        var me = this,
            id = record.getId(),
            objectStore = me.getObjectStore('rw',Ext.bind(me.removeRecord, me, [id]));
        if (!objectStore) return;
                
        var request = objectStore['delete'](id);
        request.onerror = function(event) {
            me.fireEvent('exception',me, event);
        };
        

    },

    /**
     * Destroys all records stored in the proxy 
     */
    clear: function(callback, scope) {
        var me = this,
            objectStore = me.getObjectStore('rw',Ext.bind(me.clear, me, [callback, scope]));
            
        var request = objectStore.clear();
        request.onerror = function(event) {
            me.fireEvent('exception',me, event);
        };

        request.onsuccess = function(event) {
            me.fireEvent('cleardb', me);
            callback.call(scope || me);
        };

        
    }
});