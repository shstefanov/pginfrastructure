const pg = require("pg");

module.exports = function(cb){
  
  const env = this;

  const helpers = require("infrastructure/lib/helpers");
  const _       = require("underscore");
  const fs      = require("fs");
  const path    = require("path");

  const pool    = new pg.Pool(env.config.postgre);

  var tasks = [];

  pool.on("error", function(err){
    env.i.do("log.error", "postgre", err);
  });    

  pool.connect(function(err){
    if(err) return cb(err);
    env.i.do("log.sys", "postgre", "Connected to PostgreSQL database");
    env.engines.pg_pool = pool;


    if(env.config.options.reset){

      tasks = tasks.concat(_.keys(env.config.sql).map((task_name)=>{
        return (cb)=>{
          const file_path = path.join(env.config.rootDir, env.config.sql[task_name]);
          env.i.do("log.sys", "postgre", `Running task ${task_name} -> ${file_path}`);
          fs.readFile(file_path, "utf8", (err, sql_source) => {
            if(err) return cb(err);
            pool.query(sql_source, (err, result) => {
              if(err) return cb(err);
              console.log("RESULT FOR TASK "+ task_name, result.rows);
              cb();
            });
          });
        };
      }));

    }

    helpers.chain(tasks)(cb);

  });


}