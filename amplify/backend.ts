import { defineBackend } from '@aws-amplify/backend';
import { MontyHallApi } from './custom/montyHallApi/resource';

const backend = defineBackend({});

const apiStack = backend.createStack('MontyHallApiStack');
const montyHallApi = new MontyHallApi(apiStack, 'MontyHallApi');

backend.addOutput({
  custom: {
    montyHallApiBaseUrl: montyHallApi.url,
  },
});
