
exports.up = async(knex) => {
    const hasCrypto = await knex
        .schema
        .hasTable('public_key');

    if (!hasCrypto)
        await knex
            .schema
            .createTable('public_key', table => {
                table.increments('id').primary().unsigned();
                table.text('publicKey', 'longtext');
                table.text('privateKey', 'longtext');
                table.text('location', 'longtext');
                table.string('expiration');
                table.string('account');
                table.string('address');
            });
};

exports.down = async (knex) => {
    await knex.schema
        .dropTable('public_key')
};