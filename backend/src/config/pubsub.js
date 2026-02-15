const { PubSub } = require('@google-cloud/pubsub');
const logger = require('../utils/logger');

let pubsubClient;
let isEmulator = false;

// Initialize Pub/Sub client
function initializePubSub() {
  const projectId = process.env.PUBSUB_PROJECT_ID || 'ai-gov-local';
  const emulatorHost = process.env.PUBSUB_EMULATOR_HOST;

  if (emulatorHost) {
    // Local emulator mode
    isEmulator = true;
    process.env.PUBSUB_EMULATOR_HOST = emulatorHost;
    logger.info(`Using Pub/Sub emulator at ${emulatorHost}`);
  }

  try {
    pubsubClient = new PubSub({ projectId });
    logger.info(`Pub/Sub client initialized for project: ${projectId}`);
  } catch (error) {
    logger.error('Failed to initialize Pub/Sub client', { error: error.message });
    throw error;
  }
}

// Get or create topic
async function getOrCreateTopic(topicName) {
  try {
    const topic = pubsubClient.topic(topicName);
    const [exists] = await topic.exists();
    
    if (!exists) {
      await topic.create();
      logger.info(`Created topic: ${topicName}`);
    }
    
    return topic;
  } catch (error) {
    logger.error(`Error getting/creating topic ${topicName}`, { error: error.message });
    throw error;
  }
}

// Publish message
async function publishMessage(topicName, data, attributes = {}) {
  try {
    const topic = await getOrCreateTopic(topicName);
    const messageId = await topic.publishMessage({
      data: Buffer.from(JSON.stringify(data)),
      attributes
    });
    logger.info(`Published message to ${topicName}`, { messageId, attributes });
    return messageId;
  } catch (error) {
    logger.error(`Error publishing message to ${topicName}`, { error: error.message });
    throw error;
  }
}

// Subscribe to topic
async function subscribeToTopic(topicName, subscriptionName, messageHandler) {
  try {
    const topic = await getOrCreateTopic(topicName);
    let subscription = pubsubClient.subscription(subscriptionName);
    const [exists] = await subscription.exists();
    
    if (!exists) {
      [subscription] = await topic.createSubscription(subscriptionName);
      logger.info(`Created subscription: ${subscriptionName}`);
    }
    
    subscription.on('message', async (message) => {
      try {
        const data = JSON.parse(message.data.toString());
        logger.info(`Received message from ${subscriptionName}`, { messageId: message.id });
        await messageHandler(data, message.attributes);
        message.ack();
      } catch (error) {
        logger.error(`Error processing message from ${subscriptionName}`, { 
          error: error.message,
          messageId: message.id
        });
        message.nack();
      }
    });
    
    subscription.on('error', (error) => {
      logger.error(`Subscription error for ${subscriptionName}`, { error: error.message });
    });
    
    logger.info(`Subscribed to ${subscriptionName}`);
    return subscription;
  } catch (error) {
    logger.error(`Error subscribing to ${subscriptionName}`, { error: error.message });
    throw error;
  }
}

// Initialize on module load
if (!pubsubClient) {
  initializePubSub();
}

module.exports = {
  publishMessage,
  subscribeToTopic,
  getOrCreateTopic,
  isEmulator
};







