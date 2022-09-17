'use strict';

const bookshelf = require('../bootstrap/bookshelf_instance').bookshelf;

const SmartContract = bookshelf.Model.extend({
        tableName: 'smart_contract_version',
    },
    {
        jsonColumns: ['data']
    }
);

module.exports.model = bookshelf.model('SmartContract', SmartContract);
