/*

This file is part of Ext JS 4

Copyright (c) 2011 Sencha Inc

Contact:  http://www.sencha.com/contact

GNU General Public License Usage
This file may be used under the terms of the GNU General Public License version 3.0 as published by the Free Software Foundation and appearing in the file LICENSE included in the packaging of this file.  Please review the following information to ensure the GNU General Public License version 3.0 requirements will be met: http://www.gnu.org/copyleft/gpl.html.

If you are unsure which license is appropriate for your use, please contact the sales department at http://www.sencha.com/contact.

*/
Ext.Loader.setConfig({
    enabled: true
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

Ext.onReady(function(){

    function formatDate(value){
        return value ? Ext.Date.dateFormat(value, 'M d, Y') : '';
    }

    Ext.define('Company', {
        extend: 'Ext.data.Model',
		idProperty: 'id',
		proxy: {
			type: 'webdb',
			dbName: 'companies',
			dbTable: 'company',
			dbVersion: '1.19',
            writer: {
                type: 'json',
                writeAllFields: false
            },
			initialData: [
				{
					name: 'IBM',
					employees: 33,
					incorporation: new Date()
				},{
					name: 'Hilton',
					employees: 411,
					incorporation: new Date()
				}
			]
		},
		fields: [
			{name: 'name', type: 'string'},
			{name: 'employees', type: 'int'},
			{name: 'incorporation', type: 'date'}
		]
    });


    // create the Data Store
    var store = Ext.create('Ext.data.Store', {
        // destroy the store if the grid is destroyed
        autoDestroy: true,
		autoSync: true,
		autoLoad: true,
        model: 'Company',
        sorters: [{
            property: 'name',
            direction:'ASC'
        }]
    });

	Company.getProxy().on('initialDataInserted', function() {store.load()});
	
    var cellEditing = Ext.create('Ext.grid.plugin.CellEditing', {
        clicksToEdit: 1
    });

	var dateRenderer = function(v) {
		return Ext.isDate(v)?Ext.Date.format(v, 'd-m-Y'):null;
	}
    // create the grid and specify what field you want
    // to use for the editor at each header.
    var grid = Ext.create('Ext.grid.Panel', {
        store: store,
        columns: [{
           	 	id: 'common',
	            header: 'Common Name',
	            dataIndex: 'name',
	            flex: 2,
	            field: {
	                allowBlank: false
	            }
        	}, {
	            header: '# of employees',
	            dataIndex: 'employees',
	            flex: 1,
	            field: {
					xtype: 'numberfield',
	                allowBlank: false
				}
	        }, {
	            header: 'Incorporation date',
	            dataIndex: 'incorporation',
	            flex: 1,
				renderer: dateRenderer,
	            field: {
					xtype: 'datefield',
	                allowBlank: false,
					format:'d-m-Y'
				}
	        }
	    ],
        selModel: {
            selType: 'cellmodel'
        },
        renderTo: 'editor-grid',
        width: 600,
        height: 300,
        title: 'Edit Companies',
        frame: true,
        tbar: [{
            text: 'Add Company',
            handler : function(){
                // Create a record instance through the ModelManager
				var ts = Ext.Date.format(new Date(), 'U');
	
                var r = Ext.ModelManager.create({
                    name: 'New Company 1',
					id: ts
                }, 'Company',ts);
				r.save();
                store.insert(0, r);
                cellEditing.startEditByPosition({row: 0, column: 0});
            }
        },	{
	            text: 'Clear database',
	            handler : function(){
	                var p = store.getProxy();
					p.clear(function() {
						store.load();
					});
	            }
	        }],
        plugins: [cellEditing]
    });
});

