exports.up = async(knex) => {
    const hasUsers = await knex
        .schema
        .hasTable('users');

    if (!hasUsers)
        await knex
            .schema
            .createTable('users', table => {
                table.increments('id').primary().unsigned();
                table.string('address').unique().notNullable();
                table.string('nonce').notNullable();
            });
};

exports.down = async (knex) => {
    await knex.schema
        .dropTable('users')
};