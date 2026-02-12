import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import app from "./app";


const PORT = process.env.PORT || 4000;

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
});



httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
});
