import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Hello');
});

server.listen(3000, () => {
  console.log('Test server listening on 3000 (default)');
});
