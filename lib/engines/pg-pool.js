const pg = require("pg");

module.exports = function(cb){
  const env = this;

  const pool = new pg.Pool(env.config.postgre);
  const helpers = require("infrastructure/lib/helpers");

  const _ = require("underscore");

  var tasks = [];

  function drop_all_schemas(cb){
    pool.query("SELECT schema_name FROM information_schema.schemata", function(err, result){
      if(err) return cb(err);
      var to_drop_tasks = _.chain(result.rows)
        .pluck("schema_name")
        
        // Do not drop following schemas
        .without("pg_catalog")
        .without("public")
        .without("information_schema")

        .map((schema_name)=>{
          return (cb)=>{
            env.i.do("log.sys", "postgre", `Dropping schema ${schema_name}`);
            pool.query(`DROP SCHEMA ${schema_name} CASCADE`, (err)=>{
              if(err) return cb(err);
              env.i.do("log.sys", "postgre", `Schema dropped: ${schema_name}`);
              cb();
            });
          };
        })

        .value();
      helpers.chain(to_drop_tasks)(cb);
    })
    // cb();
  }

  function drop_public_schema_tables(cb){
    pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'", function(err, result){
      if(err) return cb(err);
      var to_drop = _.pluck(result.rows, "table_name");
    });

    cb();
  }

  function create_schemas(cb){
    if(env.config.schema){
      var schemas_tasks = _.chain(env.config.schema)
        .keys()             // Get schema names
        .without("public")  // Omit public schema
        .map((schema_name)=>{
          return (cb)=>{
            env.i.do("log.sys", "postgre", `Creating schema ${schema_name}`);
            pool.query(`CREATE SCHEMA ${schema_name}`, (err)=>{
              if(err) return cb(err);
              env.i.do("log.sys", "postgre", `Schema created: ${schema_name}`);
              cb();
            });
          }
        })
        .value();
      helpers.chain(schemas_tasks)(cb);
    }
    else{
      cb();
    }
  }




  pool.on("error", function(err){
    env.i.do("log.error", "postgre", err);
  });    

  pool.connect(function(err){
    if(err) return cb(err);
    env.i.do("log.sys", "postgre", "Connected to PostgreSQL database");
    env.engines.pg_pool = pool;


    if(env.config.options.reset){
      tasks.push(drop_all_schemas);
      tasks.push(drop_public_schema_tables);
      tasks.push(create_schemas);
    }

    helpers.chain(tasks)(cb);

  });


}