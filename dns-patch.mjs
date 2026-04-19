import dns from 'node:dns';

const originalLookup = dns.lookup.bind(dns);
dns.lookup = function (hostname, ...args) {
  if (hostname === 'localhost') {
    return originalLookup('127.0.0.1', ...args);
  }
  return originalLookup(hostname, ...args);
};

const dnsPromises = dns.promises;
const originalPromisesLookup = dnsPromises.lookup.bind(dnsPromises);
dnsPromises.lookup = function (hostname, ...args) {
  if (hostname === 'localhost') {
    return originalPromisesLookup('127.0.0.1', ...args);
  }
  return originalPromisesLookup(hostname, ...args);
};
