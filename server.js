require('dotenv').config();
const http = require('http');
const app = require('./app');
const { setupSocket } = require('./socket');

const port = process.env.PORT || 5000;

const server = http.createServer(app);

setupSocket(server);

server.listen(port, () => {
    console.log(`Server with Socket.IO running on port ${port}`);
});
