import express from 'express';
import path from 'path';
import { setTimeout } from 'timers/promises';

const app: any = express();
let server: any;

let messages: any[] = [];
let responsesToServe: any[] = [];

let updateRequest: any = null;
let manifestToServe: any = null;
let manifestHeadersToServe: any = null;
let requestedStaticFiles: string[] = [];

export function start(port: number) {
  if (!server) {
    server = app.listen(port);
  }
}

export function stop() {
  if (server) {
    server.close();
    server = null;
  }
  messages = [];
  responsesToServe = [];
  updateRequest = null;
  manifestToServe = null;
  manifestHeadersToServe = null;
  requestedStaticFiles = [];
}

export function consumeRequestedStaticFiles() {
  const returnArray = requestedStaticFiles;
  requestedStaticFiles = [];
  return returnArray;
}

app.use(express.json());
app.use('/static', (req: any, res: any, next: any) => {
  requestedStaticFiles.push(path.basename(req.url));
  next();
});
app.use('/static', express.static(path.resolve(__dirname, '..', '.static')));

app.get('/notify/:string', (req: any, res: any) => {
  messages.push(req.params.string);
  res.set('Cache-Control', 'no-store');
  if (responsesToServe[0]) {
    res.json(responsesToServe.shift());
  } else {
    res.send('Received request');
  }
});

app.post('/post', (req: any, res: any) => {
  messages.push(req.body);
  res.set('Cache-Control', 'no-store');
  if (responsesToServe[0]) {
    res.json(responsesToServe.shift());
  } else {
    res.send('Received request');
  }
});

export async function waitForRequest(timeout: number, responseToServe?: { command: string }) {
  const finishTime = new Date().getTime() + timeout;

  if (responseToServe) {
    responsesToServe.push(responseToServe);
  }

  while (!messages.length) {
    const currentTime = new Date().getTime();
    if (currentTime >= finishTime) {
      throw new Error('Timed out waiting for response');
    }
    await setTimeout(50);
  }

  return messages.shift();
}

app.get('/update', (req: any, res: any) => {
  updateRequest = req;
  if (manifestToServe) {
    if (manifestHeadersToServe) {
      Object.keys(manifestHeadersToServe).forEach((headerName) => {
        res.set(headerName, manifestHeadersToServe[headerName]);
      });
    }
    res.json(manifestToServe);
  } else {
    res.status(404).send('No update available');
  }
});

export function serveManifest(manifest: any, headers: any = null) {
  manifestToServe = manifest;
  manifestHeadersToServe = headers;
}

export async function waitForUpdateRequest(timeout: number) {
  const finishTime = new Date().getTime() + timeout;
  while (!updateRequest) {
    const currentTime = new Date().getTime();
    if (currentTime >= finishTime) {
      throw new Error('Timed out waiting for update request');
    }
    await setTimeout(50);
  }

  const request = updateRequest;
  updateRequest = null;
  return request;
}
