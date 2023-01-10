const app = require('express')()
const bullmq = require('bullmq')
const Queue = require('bull')
const Redis = require('ioredis').default
const { createBullBoard } = require('@bull-board/api')
const { BullAdapter } = require('@bull-board/api/bullAdapter')
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter')
const { ExpressAdapter } = require('@bull-board/express')

const serverAdapter = new ExpressAdapter()
const { setQueues } = createBullBoard({ queues: [], serverAdapter })
const router = serverAdapter.getRouter()

Queue.prototype.toKey = function (queueType) {
  // origin is [this.keyPrefix, this.name, queueType].join(':');
  return [this.name, queueType].join(':')
}

main()
async function main() {
  await setupBullBoard()
  app.use('/', router)
  app.listen(3000, () => console.log('start on port 3000'))
}

async function setupBullBoard() {
  const redisConfig = process.env.BULL_REDIS_NAME
    ? {
        sentinels: [
          {
            host: process.env.BULL_REDIS_HOST,
            port: parseInt(process.env.BULL_REDIS_PORT || '6379'),
          },
        ],
        name: process.env.BULL_REDIS_NAME,
      }
    : {
        host: process.env.BULL_REDIS_HOST,
        port: parseInt(process.env.BULL_REDIS_PORT || '6379'),
      }
  const redis = new Redis(redisConfig)
  const keys = await redis.keys(`*:*:*`)
  const uniqKeys = new Set(
    keys.map((key) => key.replace(/^(.+?):(.+?):.+?$/, '$1:$2'))
  )
  const queueList = Array.from(uniqKeys)
    .sort()
    // .map((item) => item.split(':'))
    // .map(([prefix, queueName]) =>
    //   process.env.BULL_VERSION === 'BULLMQ'
    //     ? new BullMQAdapter(
    //         new bullmq.Queue(queueName, {
    //           connection: redisConfig,
    //           prefix,
    //         })
    //       )
    //     : new BullAdapter(
    //         new Queue(queueName, {
    //           redis: redisConfig,
    //           prefix,
    //         })
    //       )
    // )
    .map((item) =>
      process.env.BULL_VERSION === 'BULLMQ'
        ? new BullMQAdapter(
            new bullmq.Queue(item, {
              connection: redisConfig,
            })
          )
        : new BullAdapter(
            new Queue(item, {
              redis: redisConfig,
            })
          )
    )
  setQueues(queueList)
}
