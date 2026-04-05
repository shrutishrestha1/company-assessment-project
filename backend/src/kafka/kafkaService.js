const { Kafka, Partitioners } = require('kafkajs');
const logger = require('../utils/logger');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'remit-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: {
    initialRetryTime: 300,
    retries: 8,
  },
});

const TOPIC = process.env.KAFKA_TOPIC || 'transactions';
const GROUP_ID = process.env.KAFKA_GROUP_ID || 'remit-consumer-group';

let producer;
let consumer;

// ─── Producer ───────────────────────────────────────────────
const connectProducer = async () => {
  try {
    producer = kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });
    await producer.connect();
    logger.info('Kafka producer connected');
    return producer;
  } catch (error) {
    logger.error('Kafka producer connection failed:', error.message);
    throw error;
  }
};

const produceTransaction = async (transactionData) => {
  try {
    if (!producer) await connectProducer();
    await producer.send({
      topic: TOPIC,
      messages: [
        {
          key: transactionData.referenceNo,
          value: JSON.stringify({
            ...transactionData,
            producedAt: new Date().toISOString(),
          }),
        },
      ],
    });
    logger.info(`Transaction produced to Kafka: ${transactionData.referenceNo}`);
    return true;
  } catch (error) {
    logger.error('Failed to produce transaction to Kafka:', error.message);
    throw error;
  }
};

// ─── Consumer ───────────────────────────────────────────────
const connectConsumer = async (onMessage) => {
  try {
    consumer = kafka.consumer({ groupId: GROUP_ID });
    await consumer.connect();
    await consumer.subscribe({ topic: TOPIC, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          logger.info(`Kafka message received: ${data.referenceNo}`);
          await onMessage(data, message.offset);
        } catch (err) {
          logger.error('Error processing Kafka message:', err.message);
        }
      },
    });

    logger.info('Kafka consumer started');
  } catch (error) {
    logger.error('Kafka consumer failed:', error.message);
    throw error;
  }
};

const disconnectKafka = async () => {
  try {
    if (producer) await producer.disconnect();
    if (consumer) await consumer.disconnect();
    logger.info('Kafka disconnected');
  } catch (error) {
    logger.error('Error disconnecting Kafka:', error.message);
  }
};

module.exports = {
  connectProducer,
  produceTransaction,
  connectConsumer,
  disconnectKafka,
  TOPIC,
};
