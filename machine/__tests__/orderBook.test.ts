import { interpret } from "xstate";
import { orderBookMachine } from "../orderBook";
import { Server } from "mock-socket";

describe("order book machine", () => {
  const socketUrl = "ws://localhost:8080";
  let mockServer: Server;

  beforeEach(() => {
    mockServer = new Server(socketUrl);
  });

  afterEach(() => {
    mockServer.stop();
  });

  it("DISCONNECTED -> CONNECTED - connects to websocket", (done) => {
    const orderBookService = interpret(orderBookMachine)
      .onTransition((state) => {
        if (state.matches("connected")) {
          done();
        }
      })
      .start();

    orderBookService.send("CONNECT", { socketUrl });
  });

  it("DISCONNECTED -> DISCONNECTED - fails to connect to websocket", (done) => {
    expect.assertions(1);

    const orderBookService = interpret(orderBookMachine)
      .onTransition((state) => {
        if (state.matches("error")) {
          expect(state.context.error).toBeDefined();
          done();
        }
      })
      .start();

    orderBookService.send("CONNECT", { socketUrl: "wrong-socket-url" });
  });

  describe("CONNECTED", () => {
    const productId = "some-product-id";
    const feed = "some-feed";

    it("CONNECTED -> UNSUBSCRIBED - connects to websocket unsubscribed", (done) => {
      const orderBookService = interpret(orderBookMachine)
        .onTransition((state) => {
          if (state.matches("connected.unsubscribed")) {
            done();
          }
        })
        .start();

      orderBookService.send("CONNECT", { socketUrl });
    });

    it("UNSUBSCRIBED -> SUBSCRIBED - subscribes to product", (done) => {
      expect.assertions(2);
      let subscribed = false;

      const orderBookService = interpret(orderBookMachine)
        .onTransition((state) => {
          if (!subscribed && state.matches("connected.unsubscribed")) {
            orderBookService.send("SUBSCRIBE", { productId, feed });
            subscribed = true;
          } else if (subscribed) {
            expect(
              state.matches("connected.subscribed.listening")
            ).toBeTruthy();
          }
        })
        .start();

      mockServer.on("connection", (socket) => {
        socket.on("message", (data) => {
          expect(JSON.parse(data.toString())).toEqual({
            event: "subscribe",
            feed,
            product_ids: [productId],
          });
          done();
        });
      });
      orderBookService.send("CONNECT", { socketUrl });
    });

    it("SUBSCRIBED -> UNSUBSCRIBED - unsubscribes from product", (done) => {
      expect.assertions(2);

      let unsubscribed = false;

      const orderBookService = interpret(orderBookMachine)
        .onTransition((state) => {
          if (!unsubscribed && state.matches("connected.unsubscribed")) {
            orderBookService.send("SUBSCRIBE", { productId, feed });
          } else if (state.matches("connected.subscribed.listening")) {
            orderBookService.send("UNSUBSCRIBE");
            unsubscribed = true;
          } else if (unsubscribed) {
            expect(state.matches("connected.unsubscribed")).toBeTruthy();
          }
        })
        .start();

      mockServer.on("connection", (socket) => {
        socket.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.event === "unsubscribe") {
            expect(message).toEqual({
              event: "unsubscribe",
              feed,
              product_ids: [productId],
            });
            done();
          }
        });
      });
      orderBookService.send("CONNECT", { socketUrl });
    });

    it("SUBSCRIBED -> SUBSCRIBED - not allowed", (done) => {
      expect.assertions(2);

      const otherProductId = "other-product-id";
      const otherFeed = "other-feed";
      let subscribed = false;

      const orderBookService = interpret(orderBookMachine)
        .onTransition((state) => {
          if (!subscribed && state.matches("connected.unsubscribed")) {
            orderBookService.send("SUBSCRIBE", { productId, feed });
          } else if (
            !subscribed &&
            state.matches("connected.subscribed.listening")
          ) {
            orderBookService.send("SUBSCRIBE", {
              productId: otherProductId,
              feed: otherFeed,
            });
            subscribed = true;
          } else if (
            subscribed &&
            state.matches("connected.subscribed.listening")
          ) {
            expect(state.context.subscribedFeed).toEqual(feed);
            expect(state.context.subscribedProductId).toEqual(productId);
            done();
          }
        })
        .start();

      orderBookService.send("CONNECT", { socketUrl });
    });

    it("SUBSCRIBED -> MESSAGE_RECEIVED - reads message from web socket", (done) => {
      expect.assertions(1);

      const message = { some: "message-from-websocket" };

      const orderBookService = interpret(orderBookMachine)
        .onTransition((state) => {
          if (state.matches("connected.unsubscribed")) {
            orderBookService.send("SUBSCRIBE", { productId, feed });
          } else if (state.matches("connected.subscribed.messageReceived")) {
            expect(state.context.lastMessage).toEqual(message);
            done();
          }
        })
        .start();

      mockServer.on("connection", (socket) => {
        // send message in separate thread after connection
        setTimeout(() => socket.send(JSON.stringify(message)), 100);
      });

      orderBookService.send("CONNECT", { socketUrl });
    });

    it("MESSAGE_RECEIVED -> MESSAGE_RECEIVED - reads message from web socket", (done) => {
      expect.assertions(2);

      const message = { some: "some-message-from-websocket" };
      const otherMessage = { other: "other-message-from-websocket" };
      let checkFirstMessage = false;

      const orderBookService = interpret(orderBookMachine)
        .onTransition((state) => {
          if (state.matches("connected.unsubscribed")) {
            orderBookService.send("SUBSCRIBE", { productId, feed });
          }
          if (state.matches("connected.subscribed.messageReceived")) {
            if (!checkFirstMessage) {
              expect(state.context.lastMessage).toEqual(message);
              checkFirstMessage = true;
            } else {
              expect(state.context.lastMessage).toEqual(otherMessage);
              done();
            }
          }
        })
        .start();

      mockServer.on("connection", (socket) => {
        // send message in separate thread after connection
        setTimeout(() => socket.send(JSON.stringify(message)), 100);
        setTimeout(() => socket.send(JSON.stringify(otherMessage)), 200);
      });

      orderBookService.send("CONNECT", { socketUrl });
    });

    it("MESSAGE_RECEIVED -> MESSAGE_RECEIVED - ignores invalid payloads", (done) => {
      expect.assertions(3);

      const message = {
        asks: ["wrong", "payload"],
        bids: ["wrong", "payload"],
      };

      const orderBookService = interpret(orderBookMachine)
        .onTransition((state) => {
          if (state.matches("connected.unsubscribed")) {
            orderBookService.send("SUBSCRIBE", { productId, feed });
          }
          if (state.matches("connected.subscribed.messageReceived")) {
            expect(state.context.lastMessage).toEqual(message);
            expect(state.context.asks.size).toBe(0);
            expect(state.context.bids.size).toBe(0);
            done();
          }
        })
        .start();

      mockServer.on("connection", (socket) => {
        // send message in separate thread after connection
        setTimeout(() => socket.send(JSON.stringify(message)), 100);
      });

      orderBookService.send("CONNECT", { socketUrl });
    });

    it("MESSAGE_RECEIVED -> MESSAGE_RECEIVED - calculates order book", (done) => {
      expect.assertions(2);

      const message = {
        product_id: productId,
        asks: [[2, 20]],
        bids: [[1, 10]],
      };
      let checkFirstMessage = false;
      const rowsToShow = 5;

      const orderBookService = interpret(orderBookMachine)
        .onTransition((state) => {
          if (state.matches("connected.unsubscribed")) {
            orderBookService.send("SUBSCRIBE", { productId, feed });
          }
          if (state.matches("connected.subscribed.messageReceived")) {
            if (!checkFirstMessage) {
              expect(state.context.lastMessage).toEqual(message);
              orderBookService.send("CALCULATE", { rowsToShow });
              checkFirstMessage = true;
            } else {
              expect(state.context).toMatchObject({
                spread: 1,
                spreadPercentage: 100,
                parsedAsks: [
                  {
                    partialTotal: 20,
                    price: 2,
                    size: 20,
                  },
                ],
                parsedBids: [
                  {
                    partialTotal: 10,
                    price: 1,
                    size: 10,
                  },
                ],
                grandTotal: 20,
              });
              done();
            }
          }
        })
        .start();

      mockServer.on("connection", (socket) => {
        // send message in separate thread after connection
        setTimeout(() => socket.send(JSON.stringify(message)), 100);
      });

      orderBookService.send("CONNECT", { socketUrl });
    });

    it("MESSAGE_RECEIVED -> MESSAGE_RECEIVED - ignores message if product_id is different from subscribed product_id", (done) => {
      expect.assertions(3);

      const message = {
        product_id: "other-product",
        asks: [[2, 20]],
        bids: [[1, 10]],
      };
      let checkFirstMessage = false;
      const rowsToShow = 5;

      const orderBookService = interpret(orderBookMachine)
        .onTransition((state) => {
          if (state.matches("connected.unsubscribed")) {
            orderBookService.send("SUBSCRIBE", { productId, feed });
          }
          if (state.matches("connected.subscribed.messageReceived")) {
            if (!checkFirstMessage) {
              expect(state.context.lastMessage).toEqual(message);
              orderBookService.send("CALCULATE", { rowsToShow });
              checkFirstMessage = true;
            } else {
              expect(state.context.asks.size).toBe(0);
              expect(state.context.bids.size).toBe(0);
              done();
            }
          }
        })
        .start();

      mockServer.on("connection", (socket) => {
        // send message in separate thread after connection
        setTimeout(() => socket.send(JSON.stringify(message)), 100);
      });

      orderBookService.send("CONNECT", { socketUrl });
    });

    it("SUBSCRIBED -> DISCONNECT - disconnects from web socket", (done) => {
      expect.assertions(3);

      const message = { asks: [[2, 20]], bids: [[1, 10]] };

      const orderBookService = interpret(orderBookMachine)
        .onTransition((state) => {
          if (state.matches("connected.unsubscribed")) {
            orderBookService.send("SUBSCRIBE", { productId, feed });
          } else if (state.matches("connected.subscribed.messageReceived")) {
            orderBookService.send("DISCONNECT");
          } else if (state.changed && state.matches("disconnected")) {
            expect(state.context.lastMessage).toEqual(message);
            expect(state.context.asks.size).toEqual(0);
            expect(state.context.bids.size).toEqual(0);
            done();
          }
        })
        .start();

      mockServer.on("connection", (socket) => {
        // send message in separate thread after connection
        setTimeout(() => socket.send(JSON.stringify(message)), 100);
      });

      orderBookService.send("CONNECT", { socketUrl });
    });

    it("CONNECTED -> UNSUBSCRIBE - handle socket close", (done) => {
      let subscribed = false;

      const orderBookService = interpret(orderBookMachine)
        .onTransition((state) => {
          if (state.matches("connected.unsubscribed")) {
            orderBookService.send("SUBSCRIBE", { productId, feed });
            subscribed = true;
          }
          if (subscribed && state.matches("disconnected")) {
            done();
          }
        })
        .start();

      mockServer.on("connection", (socket) => {
        socket.close();
      });

      orderBookService.send("CONNECT", { socketUrl });
    });
  });
});
