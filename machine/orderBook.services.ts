import { MachineOptions, Sender } from "xstate";
import { OrderBookContext, OrderBookEvent } from "../interfaces/orderBook";

export const services: Partial<
  MachineOptions<OrderBookContext, OrderBookEvent>
> = {
  services: {
    checkForWebSocketErrors: (context) => (send: Sender<OrderBookEvent>) => {
      const errorListener = (event: WebSocketEventMap["error"]) => {
        send({ type: "ERROR", error: event });
      };

      const closeListener = () => {
        send({ type: "DISCONNECT" });
      };

      context.ws?.addEventListener("error", errorListener);
      context.ws?.addEventListener("close", closeListener);

      return () => {
        context.ws?.removeEventListener("error", errorListener);
        context.ws?.removeEventListener("close", closeListener);
      };
    },
    checkForWebSocketMessages: (context) => (send: Sender<OrderBookEvent>) => {
      const listener = (event: WebSocketEventMap["message"]) => {
        send({ type: "MESSAGE_RECEIVED", data: JSON.parse(event.data) });
      };

      context.ws?.addEventListener("message", listener);

      return () => {
        context.ws?.removeEventListener("message", listener);
      };
    },
    initializeWebSocket: (_, event) => {
      return new Promise((resolve, reject) => {
        if (event.type !== "CONNECT") return reject();
        try {
          const ws = new WebSocket(event.socketUrl);
          ws.addEventListener("open", () => {
            resolve(ws);
          });
        } catch (e) {
          reject(e);
        }
      });
    },
  },
};
