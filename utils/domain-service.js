const R = require('ramda');
const Namecheap = require('@rqt/namecheap');

const path = require('path');
require('dotenv').config({ path: path.resolve('.env.sandbox') });

const IS_SANDBOX = true;
const { NC_USER, NC_API_KEY, NC_DOMAIN } = process.env;
const TTL = 5*60;

const getDomainService = ({ Namecheap }) => {
  const nc = new Namecheap({
    user: NC_USER,
    key: NC_API_KEY,
    ip: '103.226.85.9',
    sandbox: IS_SANDBOX,
  });

  let hostList = [];

  const getHosts = async () => {
    if (hostList.length) return hostList;

    const list = await nc.dns.getHosts(NC_DOMAIN)
      .then(R.propOr([], 'hosts'))
      .then(R.map(host => R.omit(['Name', 'Type'], {
        ...host,
        HostName: host.Name,
        RecordType: host.Type,
        Address: `${host.Address}`.replace(/\.$/g, ''),
      })));

    hostList = list;
    return list;
  };

  const setHosts = hosts => {
    return nc.dns.setHosts(NC_DOMAIN, hosts);
  };

  const getHostKey = host => `${host.HostName}--${host.RecordType}`;
  const toHostMap = hosts => hosts.reduce((acc, host) => {
    const key = getHostKey(host);
    return { ...acc, [key]: [ ...(acc[key] || []), host ] };
  }, {});
  const updateHosts = async hosts => {
    const hostList = await getHosts();
    const remoteHostMap = toHostMap(hostList);
    const localHostMap = toHostMap(hosts);

    const newHostList = R.toPairs(localHostMap).reduce((acc, [key, local]) => {
      const remote = remoteHostMap[key];

      if (remote) {
        return acc.concat(local.map((localItem, index) => R.merge(remote[index], localItem)));
      }

      return [...acc, ...local];
    }, []);

    await setHosts(newHostList);
  };

  return { getHosts, setHosts, updateHosts };
}

module.exports = {
  getDomainService,
  domainService: getDomainService({ Namecheap }),
};

//getDomainService({ Namecheap }).setHosts([
  //{ HostName: 'fuck', RecordType: 'CNAME', Address: 'google.com', TTL },
  //{ HostName: 'fuck.booboo.xyz', RecordType: 'URL', Address: 'https://fuck.booboo.xyz' },
  //{ HostName: 'foobar', RecordType: 'CNAME', Address: 'duckduckgo.com', TTL },
  //{ HostName: 'hello', RecordType: 'A', Address: '103.130.211.123', TTL },
//]).then(console.log).catch(console.error);

//getDomainService({ Namecheap }).getHosts()
  //.then(console.log)
  //.catch(console.error);

//getDomainService({ Namecheap }).hasHost({ HostName: 'fuck', RecordType: 'CNAME', Address: 'duckduckgo.com' });
