/**
 * Bootleg PeerJS externs to make CheckJS happy.
 */

/**
 * @typedef {Object} Peer
 * @property {(function('open', function(string): void): void)&(function("connection", function(Connection): void): void)} on
 * @property {function(string): Connection} connect
 */

/**
 * @typedef {Object} Connection
 * @property {(function('open', function(string): void): void)&(function("data", function(string): void): void)} on
 * @property {function(string): void} send
 */