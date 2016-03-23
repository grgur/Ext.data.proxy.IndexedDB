Ext.Loader.setConfig({
    enabled : true
});
Ext.Loader.setPath('Ext.ux', 'http://cdn.sencha.io/ext-4.0.2a/examples/ux');

Ext.require([
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.state.*',
    'Ext.form.*'
]);

Ext.onReady(function () {
    function init() {
        var currentCompanyId = -1;
        
        //Init gets called once indexedDB has been initialized via
        //Ext.data.proxy.IndexedDBManager.initializeDB
        //Define the models
        Ext.define('Company', {
            extend     : 'Ext.data.Model',
            idProperty : 'id',          
            requires: [
                'Ext.data.UuidGenerator'
            ],        
            idgen: 'uuid',
            fields     : [
                {name : 'name', type : 'string'},
                {name : 'employees', type : 'int'},
                {name : 'incorporation', type : 'date'}
            ]
        });

        Ext.define('Employee', {
            extend     : 'Ext.data.Model',
            idProperty : 'id',          
            requires: [
                'Ext.data.UuidGenerator'
            ],        
            idgen: 'uuid',
            fields     : [
                {name : 'firstName', type : 'string'},
                {name : 'lastName', type : 'string'},            
                {name : 'companyId', type : 'string'}
            ]
        });    

        // create the Data Store
        var companyStore = Ext.create('Ext.data.Store', {
            initialDataLoaded: false,
            autoSync    : true,
            autoLoad    : true,
            model       : 'Company',
            listeners: {
                load: function() {
                    if (this.count() === 0 && !this.initialDataLoaded) {
                        this.add([{
                            //id            : 1,
                            name          : 'IBM',
                            employees     : 33,
                            incorporation : new Date()
                        }, {
                            //id            : 2,
                            name          : 'Hilton',
                            employees     : 411,
                            incorporation : new Date()
                        }
                        ]);
                    }
                    this.initialDataLoaded  = true;

                }
            },
            proxy      : {
                type            : 'idb',
                dbName          : 'companyinfo',
                objectStoreName : 'company',
                dbVersion       : 2
            },        
            sorters     : [
                {
                    property  : 'name',
                    direction : 'ASC'
                }
            ]
        });

        var employeeStore = Ext.create('Ext.data.Store', {
            autoSync    : true,
            autoLoad    : true,
            model       : 'Employee',
            proxy      : {
                type            : 'idb',
                dbName          : 'companyinfo',
                objectStoreName : 'employee',
                dbVersion       : 2
            },        
            sorters     : [
                {
                    property  : 'name',
                    direction : 'ASC'
                }
            ]
        });

        var cellEditing = Ext.create('Ext.grid.plugin.CellEditing', {
            clicksToEdit : 1, 
            listeners: {
                beforeedit: function(editor, event) {
                    currentCompanyId = event.record.getId();
                    var loadParams = {
                            params: {                                
                               index: 'companyIdIdx',
                               indexValue: currentCompanyId
                           }
                    };                    
                    employeeStore.load(loadParams);
                    employeeGrid.setTitle('Edit Employees for '+event.record.get('name'));
                    employeeGrid.enable();
                    return true;
                }
            }
        });
        
        var dateRenderer = function (v) {
            return Ext.isDate(v) ? Ext.Date.format(v, 'd-m-Y') : null;
        };

        // create the grid and specify what field you want
        // to use for the editor at each header.
        var grid = Ext.create('Ext.grid.Panel', {
            store    : companyStore,
            columns  : [
                {
                    id        : 'common',
                    header    : 'Common Name',
                    dataIndex : 'name',
                    flex      : 2,
                    field     : {
                        allowBlank : false
                    }
                },
                {
                    header    : '# of employees',
                    dataIndex : 'employees',
                    flex      : 1,
                    field     : {
                        xtype      : 'numberfield',
                        allowBlank : false
                    }
                },
                {
                    header    : 'Incorporation date',
                    dataIndex : 'incorporation',
                    flex      : 1,
                    renderer  : dateRenderer,
                    field     : {
                        xtype      : 'datefield',
                        allowBlank : false,
                        format     : 'd-m-Y'
                    }
                }
            ],
            selModel : {
                selType : 'cellmodel'
            },
            renderTo : 'editor-grid',
            width    : 600,
            height   : 300,
            title    : 'Edit Companies',
            frame    : true,
            tbar     : [
                'Search (Exact Value)',
                {
                    xtype: 'textfield',
                    name: 'searchField',
                    hideLabel: true,
                    width: 200,
                    listeners: {
                        change: {
                            fn: function(field, newValue) {
                                var loadParams = {
                                    params: {
                                        index: 'companyNameIdx',
                                        indexValue: newValue
                                    }
                                };                    
                                companyStore.load(loadParams);

                            },
                            scope: this,
                            buffer: 100
                        }
                    }
                },

                {
                    text    : 'Add Company',
                    handler : function () {
                        var r = Ext.create('Company',{
                            name : 'New Company 1'                        
                        });
                        companyStore.insert(0, r);
                        cellEditing.startEditByPosition({row : 0, column : 0});
                    }
                }
            ],
            plugins  : [cellEditing]
        });

        var employeeCellEditing = Ext.create('Ext.grid.plugin.CellEditing', {
            clicksToEdit : 1
        });

        var employeeGrid = Ext.create('Ext.grid.Panel', {
            disabled: true,
            store    : employeeStore,
            columns  : [
                {
                    header    : 'First Name',
                    dataIndex : 'firstName',
                    flex: 1,
                    field     : {
                        allowBlank : false
                    }
                },
                {
                    dataIndex : 'lastName',
                    header    : 'Last Name',
                    flex: 1,
                    field     : {
                        allowBlank : false
                    }
                }
            ],
            selModel : {
                selType : 'cellmodel'
            },
            renderTo : 'employee-grid',
            width    : 600,
            height   : 300,
            title    : 'Edit Employees',
            frame    : true,
            tbar     : [
                'Search',
                {
                    xtype: 'textfield',
                    name: 'searchField',
                    hideLabel: true,
                    width: 200,
                    listeners: {
                        change: {
                            fn: function(field, newValue) {
                                var loadParams = {                                    
                                    params: {
                                        containsSearch: newValue,
                                        containsKeys: [
                                            'firstName',
                                            'lastName'
                                        ],
                                        
                                    }
                                };                    
                                employeeStore.load(loadParams);

                            },
                            scope: this,
                            buffer: 100
                        }
                    }
                },
                {
                    text    : 'Add Employee',
                    handler : function () {
                        var r = Ext.create('Employee',{
                            firstName : 'New Employee',
                            companyId: currentCompanyId
                        });
                        employeeStore.insert(0, r);
                        employeeCellEditing.startEditByPosition({row : 0, column : 0});
                    }
                },
                {
                    text    : 'Clear Employees',
                    handler : function () {
                        var p = employeeStore.getProxy();
                        p.clear(function () {
                            employeeStore.removeAll();                        
                        });
                    }
                }
            ],
            plugins  : [employeeCellEditing]
        });    
    }

    Ext.data.proxy.IndexedDBManager.initializeDB({
        dbName: 'companyinfo',        
        dbVersion: 2,
        objectStores: [{
            name: 'company',
            keyPath: 'id',
            indexes: [{
                name: 'companyNameIdx', 
                field: 'name', 
                options: {unique: true}
            }]
        }, {
            name: 'employee',
            keyPath: 'id',
            indexes: [{
                name: 'companyIdIdx', 
                field: 'companyId', 
                options: {unique: false}
            }, {
                name: 'visitDateIdx', 
                field: 'visitDate', 
                options: {unique: false}
            }]
        }],    
        listeners: {
            dbopen: init
        }
    });
        
    
});


// reload appcache when needed
if ('applicationCache' in window) {


    window.addEventListener('load', function (e) {
        var ac  = applicationCache;
        ac.addEventListener('updateready', function (e) {
            if (ac.status === ac.UPDATEREADY) {
                ac.swapCache();
                location.reload();
            }
        }, false);
    }, false);
}