
exports.up = async(knex) => {
    const hasCrypto = await knex
        .schema
        .hasTable('crypto');

    if (!hasCrypto)
        await knex
            .schema
            .createTable('crypto', table => {
                table.increments('id').primary().unsigned();
                table.string('buyerEncryptedKey');
                table.string('sellerEncryptedKey');
                table.string('marketEncryptedKey');
                table.string('iv');
                table.string('cid');
                table.string('contractAddress');
                table.string('keystring');
            });
};

exports.down = async (knex) => {
    await knex.schema
        .dropTable('crypto')
};
