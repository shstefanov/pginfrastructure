const pg = require("pg");

module.exports = function(cb){
  const env = this;

  const pool = new pg.Pool(env.config.postgre);

  pool.on("error", function(err){
    env.i.do("log.error", err);
  });    

  pool.connect(function(err){
    if(err) return cb(err);
    env.engines.pg_pool = pool;
    cb();
  });


}