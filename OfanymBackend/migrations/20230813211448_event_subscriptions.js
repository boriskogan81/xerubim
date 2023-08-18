
exports.up = async(knex) => {
    const hasEventSubscriptions = await knex
        .schema
        .hasTable('event_subscriptions');

    if (!hasEventSubscriptions)
        await knex
            .schema
            .createTable('event_subscriptions', table => {
                table.increments('id').primary().unsigned();
                table.string('contractAddress');
                table.string('email');
            });
};

exports.down = async (knex) => {
    await knex.schema
        .dropTable('event_subscriptions')
};