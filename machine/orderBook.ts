import { createMachine, assign } from "xstate";
import { OrderBookContext, OrderBookEvent } from "../interfaces/orderBook";
import { actions } from "./orderBook.actions";
import { services } from "./orderBook.services";

export const orderBookMachine = createMachine<OrderBookContext, OrderBookEvent>(
  {
    initial: "disconnected",
    context: {
      asks: new Map<number, number>(),
      bids: new Map<number, number>(),
      spread: 0,
      spreadPercentage: 0,
      parsedAsks: [],
      parsedBids: [],
      grandTotal: 0,
    },
    states: {
      disconnected: {
        on: {
          CONNECT: "connecting",
        },
      },
      error: {
        on: {
          CONNECT: "connecting",
        },
      },
      connecting: {
        invoke: {
          src: "initializeWebSocket",
          onDone: {
            target: "connected",
            actions: assign({
              ws: (_, event) => event.data,
            }),
          },
          onError: {
            target: "error",
            actions: assign({
              error: (_, event) => event.data,
            }),
          },
        },
      },
      connected: {
        initial: "unsubscribed",
        invoke: {
          src: "checkForWebSocketErrors",
        },
        on: {
          ERROR: {
            target: "error",
            actions: [
              assign({
                error: (_, event) => event.error,
              }),
              "disconnectWebSocket",
            ],
          },
          DISCONNECT: {
            target: "disconnected",
            actions: "disconnectWebSocket",
          },
        },
        states: {
          unsubscribed: {
            on: {
              SUBSCRIBE: {
                target: "subscribed",
                actions: ["subscribeToProduct"],
              },
            },
          },
          subscribed: {
            invoke: {
              src: "checkForWebSocketMessages",
            },
            initial: "listening",
            states: {
              listening: {
                on: {
                  MESSAGE_RECEIVED: {
                    target: "messageReceived",
                    actions: ["parseMessage"],
                  },
                },
              },
              messageReceived: {
                on: {
                  MESSAGE_RECEIVED: {
                    target: "messageReceived",
                    actions: ["parseMessage"],
                  },
                  CALCULATE: {
                    target: "messageReceived",
                    actions: ["calculateOrderBook"],
                  },
                },
              },
            },
            on: {
              UNSUBSCRIBE: {
                target: "unsubscribed",
                actions: ["unsubscribeFromProduct"],
              },
            },
          },
        },
      },
    },
  },
  {
    services: services.services,
    actions: actions.actions,
  }
);
