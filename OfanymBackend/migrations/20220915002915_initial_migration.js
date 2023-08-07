'use strict';
exports.up = async function (knex) {
    try {
        const hasSmartContractVersion = await knex
            .schema
            .hasTable('smart_contract_version');

        if (!hasSmartContractVersion)
            await knex
                .schema
                .createTable('smart_contract_version', table => {
                    table.increments('id').primary().unsigned();
                    table.string('name');
                    table.integer('version')
                    table.json('data');
                });

        const hasContractFactory = await knex
            .schema
            .hasTable('contract_factory');

        if (!hasContractFactory)
            await knex
                .schema
                .createTable('contract_factory', table => {
                    table.increments('id').primary().unsigned();
                    table.integer('smart_contract_version_id').unsigned().notNullable();
                    table.string('address');
                    table.foreign('smart_contract_version_id').references('smart_contract_version.id')
                        .onDelete('CASCADE')
                        .onUpdate('CASCADE');
                    table.json('data');
                });

        const hasContract = await knex
            .schema
            .hasTable('contract');

        if (!hasContract)
            await knex
                .schema
                .createTable('contract', table => {
                    table.increments('id').primary().unsigned();
                    table.integer('smart_contract_version_id').unsigned().notNullable();
                    table.foreign('smart_contract_version_id').references('smart_contract_version.id')
                        .onDelete('CASCADE')
                        .onUpdate('CASCADE');
                    table.json('data');
                    table.string('address');
                    table.specificType('coordinates', 'POLYGON');
                });

        const hasMedia = await knex
            .schema
            .hasTable('media');

        if (!hasMedia)
            await knex
                .schema
                .createTable('media', table => {
                    table.increments('id').primary().unsigned();
                    table.integer('contract_id').unsigned().notNullable();
                    table.foreign('contract_id').references('contract.id')
                        .onDelete('CASCADE')
                        .onUpdate('CASCADE');
                    table.json('data');
                    table.string('hash');
                    table.specificType('coordinates', 'POINT');
                });

    } catch (e) {
        console.log('knex migrations failed with error ', e);
    }
}

exports.down = async function (knex) {
    await knex.schema
        .dropTable('contract')
        .dropTable('contract_factory')
        .dropTable('smart_contract_version')
        .dropTable('media')
};
