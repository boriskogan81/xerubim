
exports.up = async(knex) => {
    const hasSig = await knex
        .schema
        .hasTable('filekeys');

    if (!hasSig)
        await knex
            .schema
            .createTable('filekeys', table => {
                table.increments('id').primary().unsigned();
                table.string('keystring');
                table.string('location');
            });
};

exports.down = async (knex) => {
    await knex.schema
        .dropTable('filekeys')
};