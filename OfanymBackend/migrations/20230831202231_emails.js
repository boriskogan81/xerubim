exports.up = async(knex) => {
    const hasEventSubscriptions = await knex
        .schema
        .hasTable('email_subscriptions');

    if (!hasEventSubscriptions)
        await knex
            .schema
            .createTable('email_subscriptions', table => {
                table.string('address').primary();
                table.string('email');
            });
};

exports.down = async (knex) => {
    await knex.schema
        .dropTable('email_subscriptions')
};