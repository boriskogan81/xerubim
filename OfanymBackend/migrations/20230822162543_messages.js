exports.up = async(knex) => {
    const hasMessages = await knex
        .schema
        .hasTable('messages');

    if (!hasMessages)
        await knex
            .schema
            .createTable('messages', table => {
                table.increments('id').primary().unsigned();
                table.string('to').notNullable();
                table.string('from').notNullable();
                table.string('title');
                table.text('text', 'longtext');
                table.integer('contract').unsigned();
                table.integer('responseTo').unsigned();
                table.bigInteger('timestamp').unsigned();
                table.boolean('read').defaultTo(false);
                table.boolean('deleted').defaultTo(false);
            });
};

exports.down = async (knex) => {
    await knex.schema
        .dropTable('messages')
};