const intervalMs = Number(process.env.WORKER_HEARTBEAT_MS || 10000);

console.log('worker started');

setInterval(() => {
  console.log(JSON.stringify({
    service: 'worker',
    ok: true,
    timestamp: new Date().toISOString()
  }));
}, intervalMs);
