'use strict';

const bookshelf = require('../bootstrap/bookshelf_instance').bookshelf;
const Contract = require('./contract').model;

const Media = bookshelf.Model.extend({
        tableName: 'contract',
        version () {
            return this.belongsTo(Contract, 'smart_contract_version_id');
        }
    },
    {
        jsonColumns: ['data']
    });

module.exports.model = Media;