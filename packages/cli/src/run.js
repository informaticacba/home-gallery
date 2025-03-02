const fs = require('fs/promises')
const path = require('path')

const log = require('@home-gallery/logger')('cli.run')

const { loadConfig, initConfig } = require('./config')
const { startServer, importSources } = require('./tasks')

const galleryDir = path.dirname(process.argv[1])

const createOptions = argv => {
  return {
    configFile: argv.config,
    configFallback: path.join(galleryDir, 'gallery.config-example.yml'),
    sources: argv.source || false
  }
}

const config = async argv => {
  const options = createOptions(argv)
  return loadConfig(options)
}

const createConfig = argv => {
  const options = createOptions(argv)

  if (argv.force) {
    return initConfig(options)
  }

  return fs.access(options.configFile)
    .then(() => log.info(`Skip configuration initialization. File already exists: ${options.configFile}`))
    .catch(() => initConfig(options))
}

const runServer = options => {
  log.info(`Starting server`)
  return startServer(options.config)
}

const runImport = (config, initialImport, incrementalUpdate, smallFiles) => {
  const sources = config.sources.filter(source => !source.offline)

  log.info(`Import online sources from: ${sources.map(source => source.dir)}`)
  return importSources(config, sources, initialImport, incrementalUpdate, smallFiles)
}

const command = {
  command: 'run',
  describe: 'Run common tasks',
  builder: (yargs) => {
    return yargs.option({
      config: {
        alias: 'c',
        default: 'gallery.config.yml',
        describe: 'Configuration file'
      },
    })
    .command(
      'init',
      'Initialize the gallery configuration',
      (yargs) => yargs
        .option({
          source: {
            alias: 's',
            array: true,
            description: 'Initial source directory or directories'
          }
        })
        .option({
          force: {
            alias: 'f',
            boolean: true,
            description: 'Force, overwrite existing configuration'
          }
        }),
      (argv) => createConfig(argv)
          .catch(err => log.error(err, `Error: ${err}`))
      )
    .command(
      'server',
      'Start the webserver',
      (yargs) => yargs,
      (argv) => config(argv)
          .then(runServer)
          .then(() => log.info(`Have a good day...`))
          .catch(err => log.error(err, `Error: ${err}`))
      )
    .command(
      'import',
      'Import and update new files from sources',
      (yargs) => yargs.option({
        initial: {
          alias: 'i',
          boolean: true,
          describe: 'Run initial incremental import'
        },
        update: {
          alias: 'u',
          boolean: true,
          describe: 'Check and import new files'
        },
        'small-files': {
          alias: 's',
          boolean: true,
          describe: 'Import only small files up to 20MB to exclude big files such as videos to speed up the initial import'
        },
      }),
      (argv) => config(argv)
          .then(options => runImport(options.config, argv.initial, argv.update, argv.smallFiles))
          .then(() => log.info(`Have a good day...`))
          .catch(err => log.error(err, `Error: ${err}`))
      )
    .demandCommand()
  },
  handler: () => false
}

module.exports = command
