import RancherClient from './rancher';
import resolveConfig from './config';
import _, {pluck} from 'lodash';
import {info, trace, error} from './log';
import Promise, {all, delay} from 'bluebird';
import assert from 'assert';
import DNS from './dns';

(async () => {
  const config = await resolveConfig();
  info(`started with config:\n${stringify(config)}`);
  assert(config.pollServicesInterval, '`pollServicesInterval` is missing');
  assert(config.domain, '`domain` is missing');
  assert(config.port, '`port` is missing');

  const dns = new DNS();
  dns.listen(config.port);

  while(true) {
    await tick();
    await delay(config.pollServicesInterval);
  }

  async function tick() {
    info('updating services list');
    const rancher = new RancherClient(config.rancher);

    const stacksById = (await rancher.getStacks()).reduce((map, {name, id}) => {
      map[id] = name;
      return map;
    }, {});

    const services = await rancher.getServices();
    const answers = {};

    for (let service of services) {
      const instances = await rancher.getServiceContainers(service.id);
      const entry = [service.name, stacksById[service.environmentId], config.domain].join('.');
      answers[entry] = pluck(instances, 'primaryIpAddress');
    }
    info(`generated entries: ${stringify(answers)}`);
    dns.updateAnswers(answers);
  }
})();

process.on('unhandledRejection', handleError);

function handleError(err) {
  error(err);
  process.exit(1);
}

function stringify(obj) {
  return JSON.stringify(obj, null, 4);
}
