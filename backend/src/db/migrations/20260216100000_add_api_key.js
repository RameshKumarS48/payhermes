exports.up = async function (knex) {
  await knex.schema.alterTable('businesses', (t) => {
    t.string('api_key', 64).unique();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('businesses', (t) => {
    t.dropColumn('api_key');
  });
};
