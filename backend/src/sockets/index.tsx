import { Server } from "socket.io";

const connectedUsers = new Map<string, number>();

const getPresenceList = () => {
    return Array.from(connectedUsers.entries()).map(([userId, count]) => ({
      userId,
      status: count > 0 ? "connected" : "disconnected",
    }));
  };
  
  const notifyAdmins = (io: Server) => {
    io.to("role:ADMIN").emit("presence_update", getPresenceList());
  };

  const authenticateSocket = async (socket: Socket) => {
    const tokenFromAuth = socket.handshake.auth?.token as string | undefined;
    const authHeader = socket.handshake.headers.authorization as string | undefined;
    const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
    const token = tokenFromAuth || tokenFromHeader;
  
    if (!token) {
      throw new Error("Unauthorized");
    }
  
    const decoded = verifyToken(token);
    const userId = decoded.id as string | undefined;
  
    if (!userId) {
      throw new Error("Unauthorized");
    }
  
    const user = await findUserById(userId);
    if (!user) {
      throw new Error("Unauthorized");
    }
  
    socket.data.user = { id: user.id, role: user.role };
  };


export const registerSocketHandlers = (io: Server) => {
    io.use(async (socket, next) => {
      try {
        await authenticateSocket(socket);
        next();
      } catch (err) {
        next(err as Error);
      }
    });
  
    io.on("connection", (socket) => {
      const userId = socket.data.user?.id as string;
      const role = socket.data.user?.role as "ADMIN" | "USER";
  
      socket.join(`user:${userId}`);
      socket.join(`role:${role}`);
  
      connectedUsers.set(userId, (connectedUsers.get(userId) || 0) + 1);
      notifyAdmins(io);
  
      socket.on("sendMessage", async (payload, ack) => {
        try {
          const { content, receiverId, roomId } = payload || {};
  
          if (!content || !receiverId || !roomId) {
            throw new Error("content, receiverId, and roomId are required");
          }
  
          const message = await sendMessage({
            content,
            senderId: userId,
            receiverId,
            roomId,
          });
  
          io.to(`user:${receiverId}`).emit("message", message);
          io.to(`user:${userId}`).emit("message", message);
  
          if (typeof ack === "function") {
            ack({ status: "ok", message });
          }
        } catch (err) {
          if (typeof ack === "function") {
            ack({ status: "error", error: (err as Error).message });
          }
        }
      });
  
      socket.on("typing", (payload) => {
        const { receiverId, roomId, isTyping } = payload || {};
        if (!receiverId || !roomId) return;
  
        io.to(`user:${receiverId}`).emit("typing", {
          senderId: userId,
          roomId,
          isTyping: Boolean(isTyping),
        });
      });
  
      socket.on("disconnect", (reason) => {
        const current = connectedUsers.get(userId) || 0;
        if (current <= 1) {
          connectedUsers.delete(userId);
        } else {
          connectedUsers.set(userId, current - 1);
        }
  
        notifyAdmins(io);
        socket.emit("connection_status", { status: "disconnected", reason });
      });
    });
  };
  