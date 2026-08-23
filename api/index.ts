import app from '../src/app.js';

export const config = {
  maxDuration: 60,
};

export default async (req: any, res: any) => {
  await app.ready();
  app.server.emit('request', req, res);
};
