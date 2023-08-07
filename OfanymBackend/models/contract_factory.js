'use strict';

const bookshelf = require('../bootstrap/bookshelf_instance').bookshelf;
const SmartContractVersion = require('./smart_contract_version').model;

const ContractFactory = bookshelf.Model.extend({
        tableName: 'contract_factory',
        version () {
            return this.hasOne(SmartContractVersion, 'smart_contract_version_id');
        }
    },
    {
        jsonColumns: ['data']
    });

module.exports.model = ContractFactory;
