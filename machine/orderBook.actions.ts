import { assign, MachineOptions } from "xstate";
import {
  OrderBookContext,
  OrderBookData,
  OrderBookElementData,
  OrderBookEvent,
  WebSocketMessage,
  WebSocketPayload,
} from "../interfaces/orderBook";

const parseOrderBookMessageRows = (
  rows: WebSocketMessage["bids"] = [],
  saved: Map<number, number>
) => {
  rows.forEach(([price, size, ...rest]) => {
    if (rest.length === 0 && Number.isFinite(price) && Number.isFinite(size)) {
      if (size === 0) {
        saved.delete(price);
      } else {
        saved.set(price, size);
      }
    }
  });
};

export const parseOrderBookMessage = (
  message: WebSocketMessage,
  orderBook: OrderBookData
): OrderBookData => {
  parseOrderBookMessageRows(message.bids, orderBook.bids);
  parseOrderBookMessageRows(message.asks, orderBook.asks);
  return orderBook;
};

const sumSizes = (rows: Array<Array<number>>) => {
  return rows.reduce((previous, current) => previous + current[1], 0);
};

const parseRows = (rows: Array<Array<number>>): Array<OrderBookElementData> => {
  let partialTotal = 0;
  return rows.map(([price, size]) => {
    partialTotal += size;
    return {
      price,
      size,
      partialTotal,
    };
  });
};

export const calculateOrderBook = (
  context: OrderBookContext,
  rowsToShow: number
): OrderBookData => {
  const rawBids = Array.from(context.bids.entries())
    .sort(([a], [b]) => b - a)
    .slice(0, rowsToShow);
  const rawAsks = Array.from(context.asks.entries())
    .sort()
    .slice(0, rowsToShow);
  const grandTotal = Math.max(sumSizes(rawBids), sumSizes(rawAsks));
  const parsedBids = parseRows(rawBids);
  const parsedAsks = parseRows(rawAsks);
  const highestBid = parsedBids?.[0]?.price ?? 0;
  const lowestAsk = parsedAsks?.[0]?.price ?? 0;
  const spread = lowestAsk - highestBid;
  const spreadPercentage = (spread / highestBid) * 100;

  return {
    ...context,
    parsedBids,
    parsedAsks,
    spread,
    spreadPercentage,
    grandTotal,
  };
};

const sendJsonMessage = (context: OrderBookContext, message: any) => {
  if (context.ws?.readyState === context.ws?.OPEN) {
    context.ws?.send(JSON.stringify(message));
  }
};

export const actions: Partial<
  MachineOptions<OrderBookContext, OrderBookEvent>
> = {
  actions: {
    disconnectWebSocket: assign((context) => {
      context.ws?.close();
      context.asks.clear();
      context.bids.clear();
      return {
        ...context,
        ws: undefined,
      };
    }),
    subscribeToProduct: assign((context, event) => {
      if (event.type !== "SUBSCRIBE") return context;
      sendJsonMessage(context, {
        event: "subscribe",
        feed: event.feed,
        product_ids: [event.productId],
      } as WebSocketPayload);
      context.asks.clear();
      context.bids.clear();
      return {
        ...context,
        subscribedProductId: event.productId,
        subscribedFeed: event.feed,
      };
    }),
    unsubscribeFromProduct: assign((context, event) => {
      if (event.type !== "UNSUBSCRIBE" && event.type !== "SUBSCRIBE")
        return context;
      sendJsonMessage(context, {
        event: "unsubscribe",
        feed: context.subscribedFeed,
        product_ids: [context.subscribedProductId],
      } as WebSocketPayload);
      return {
        ...context,
        subscribedProductId: undefined,
        subscribedFeed: undefined,
        asks: new Map<number, number>(),
        bids: new Map<number, number>(),
      };
    }),
    parseMessage: assign((context, event) => {
      if (event.type !== "MESSAGE_RECEIVED") return context;
      const message = event.data as WebSocketMessage;
      if (message.product_id !== context.subscribedProductId)
        return {
          ...context,
          lastMessage: message,
        };
      const orderBook = parseOrderBookMessage(message, context);
      return {
        ...context,
        ...orderBook,
        lastMessage: message,
      };
    }),
    calculateOrderBook: assign((context, event) => {
      if (event.type !== "CALCULATE") return context;
      const orderBook = calculateOrderBook(context, event.rowsToShow);
      return {
        ...context,
        ...orderBook,
      };
    }),
  },
};
