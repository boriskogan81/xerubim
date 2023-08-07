
exports.up = async(knex) => {
    const hasCrypto = await knex
        .schema
        .hasTable('crypto');

    if (!hasCrypto)
        await knex
            .schema
            .createTable('crypto', table => {
                table.increments('id').primary().unsigned();
                table.text('buyerEncryptedKey', 'longtext');
                table.text('sellerEncryptedKey', 'longtext');
                table.text('marketEncryptedKey', 'longtext');
                table.string('iv');
                table.string('cid');
                table.text('contractAddress', 'longtext');
                table.string('keystring');
            });
};

exports.down = async (knex) => {
    await knex.schema
        .dropTable('crypto')
};
