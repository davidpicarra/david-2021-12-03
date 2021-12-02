export interface OrderBookElementData {
  size: number;
  price: number;
  partialTotal: number;
}

export interface OrderBookCalculatedData {
  spread: number;
  spreadPercentage: number;
  parsedBids: Array<OrderBookElementData>;
  parsedAsks: Array<OrderBookElementData>;
  grandTotal: number;
}

export interface OrderBookData extends OrderBookCalculatedData {
  bids: Map<number, number>;
  asks: Map<number, number>;
}

export interface OrderBookContext extends OrderBookData {
  lastMessage?: object;
  ws?: WebSocket;
  subscribedProductId?: string;
  subscribedFeed?: string;
  error?: object;
}

export type OrderBookEvent =
  | { type: "CONNECT"; socketUrl: string }
  | { type: "CONNECTING" }
  | { type: "CONNECTED" }
  | { type: "ERROR"; error: object }
  | { type: "UNSUBSCRIBE" }
  | { type: "SUBSCRIBE"; productId: string; feed: string }
  | { type: "MESSAGE_RECEIVED"; data: object }
  | { type: "CALCULATE"; rowsToShow: number }
  | { type: "DISCONNECT" };

export interface WebSocketPayload {
  event: "subscribe" | "unsubscribe";
  feed: string;
  product_ids: Array<string>;
}

export interface WebSocketMessage {
  numLevels?: number;
  feed: string;
  bids: Array<Array<number>>;
  asks: Array<Array<number>>;
  product_id: string;
}
