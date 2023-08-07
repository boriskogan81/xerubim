
exports.up = async(knex) => {
    const hasSig = await knex
        .schema
        .hasTable('signature');

    if (!hasSig)
        await knex
            .schema
            .createTable('signature', table => {
                table.increments('id').primary().unsigned();
                table.string('address');
                table.string('signature');
            });
};

exports.down = async (knex) => {
    await knex.schema
        .dropTable('signature')
};
