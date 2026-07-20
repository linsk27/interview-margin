import backendFullstack from './backend-fullstack.js'
import databaseCache from './database-cache.js'
import frontendEngineering from './frontend-engineering.js'
import gitEngineering from './git-engineering.js'
import networkDeployment from './network-deployment.js'
import reactCore from './react-core.js'
import vueCore from './vue-core.js'

export const GENERATED_ENRICHMENTS = new Map([
  ['git-engineering', gitEngineering],
  ['vue-core', vueCore],
  ['react-core', reactCore],
  ['frontend-engineering', frontendEngineering],
  ['backend-fullstack', backendFullstack],
  ['database-cache', databaseCache],
  ['network-deployment', networkDeployment],
])
