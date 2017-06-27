var infrastructure = require("infrastructure");
infrastructure({ /* configuration goes here */ }, function(err, env) {
  if (err) {
    throw err;
  }
});