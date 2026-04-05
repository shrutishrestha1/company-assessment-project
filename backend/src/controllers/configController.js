const { successResponse } = require('../utils/response');
const { getForexRate, getFeeTierDefinitions } = require('../config/pricing');

const APP_PUBLIC_NAME = process.env.APP_PUBLIC_NAME || 'HimalRemit';

const getPublicConfig = (_req, res) => {
  return successResponse(
    res,
    {
      appName: APP_PUBLIC_NAME,
      forexRate: getForexRate(),
      feeTiers: getFeeTierDefinitions(),
    },
    'Public configuration.'
  );
};

module.exports = { getPublicConfig };
